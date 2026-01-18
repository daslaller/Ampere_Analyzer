self.onmessage = function(e) {
    const {
      maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
      switchingFrequency, maxTemperature, ambientTemperature, totalRth,
      transistorType, rdsOnOhms, vceSat, simulationMode, coolingBudget,
      simulationAlgorithm, precisionSteps, effectiveCoolingBudget
    } = e.data;
  
    const isMosfetType = (type) => {
      return type.includes('MOSFET') || type.includes('GaN');
    };
  
    const checkCurrent = (current) => {
      let pCond = isMosfetType(transistorType)
        ? Math.pow(current, 2) * rdsOnOhms * 0.5
        : current * (vceSat || 0) * 0.5;
      const pSw = 0.5 * maxVoltage * current * ((riseTime + fallTime) * 1e-9) * (switchingFrequency * 1000);
      const pTotal = pCond + pSw;
      const tempRise = pTotal * totalRth;
      const finalTemp = ambientTemperature + tempRise;
  
      let failureReason = null;
      let details = '';
  
      if (finalTemp > maxTemperature) { 
        failureReason = 'Thermal'; 
        details = `Exceeded max junction temp of ${maxTemperature}°C. Reached ${finalTemp.toFixed(2)}°C.`; 
      }
      else if (powerDissipation && pTotal > powerDissipation) { 
        failureReason = 'Power Dissipation'; 
        details = `Exceeded component's max power dissipation of ${powerDissipation}W. Reached ${pTotal.toFixed(2)}W.`; 
      }
      else if (pTotal > effectiveCoolingBudget && simulationMode !== 'temp') { 
        failureReason = 'Cooling Budget'; 
        details = `Exceeded cooling budget of ${effectiveCoolingBudget}W. Reached ${pTotal.toFixed(2)}W.`; 
      }
      else if (current > maxCurrent) { 
        failureReason = 'Current'; 
        details = `Exceeded max current rating of ${maxCurrent.toFixed(2)}A.`; 
      }
  
      let fail = !!failureReason;
  
      if (simulationMode === 'temp') {
        fail = finalTemp > maxTemperature;
      } else if (simulationMode === 'budget') {
        fail = pTotal > effectiveCoolingBudget;
      }
  
      return {
        isSafe: !fail,
        failureReason,
        details,
        finalTemperature: finalTemp,
        powerDissipation: { total: pTotal, conduction: pCond, switching: pSw }
      };
    };
  
    const addDataPoint = (current) => {
      const pointResult = checkCurrent(current);
      const { isSafe, ...rest } = pointResult;
      
      let progress = 0;
      let limitValue = 0;
      switch (simulationMode) {
        case 'temp':
          progress = (rest.finalTemperature / maxTemperature) * 100;
          limitValue = maxTemperature;
          break;
        case 'budget':
          progress = (rest.powerDissipation.total / effectiveCoolingBudget) * 100;
          limitValue = effectiveCoolingBudget;
          break;
        case 'ftf':
        default:
          const tempProgress = (rest.finalTemperature / maxTemperature) * 100;
          const powerProgress = (powerDissipation && powerDissipation > 0) ? (rest.powerDissipation.total / powerDissipation) * 100 : 0;
          const budgetProgress = (rest.powerDissipation.total / effectiveCoolingBudget) * 100;
          const currentProgress = (current / maxCurrent) * 100;
          progress = Math.max(tempProgress, powerProgress, budgetProgress, currentProgress);
          limitValue = 100;
          break;
      }
      
      return {
        current,
        temperature: rest.finalTemperature,
        powerLoss: rest.powerDissipation.total,
        conductionLoss: rest.powerDissipation.conduction,
        switchingLoss: rest.powerDissipation.switching,
        progress: Math.min(progress, 100),
        limitValue,
        checkResult: pointResult
      };
    };
  
    // ITERATIVE ALGORITHM - Runs uninterrupted in worker with batched messages
    if (simulationAlgorithm === 'iterative') {
      let maxSafeCurrent = 0;
      const maxCurrentRange = maxCurrent * 1.2;
      const BATCH_SIZE = 10; // Send 10 points per message to reduce postMessage overhead
      let batch = [];

      for (let i = 0; i <= precisionSteps; i++) {
        const current = i * (maxCurrentRange / precisionSteps);
        const dataPoint = addDataPoint(current);

        batch.push(dataPoint);

        // Send batch when full or at specific intervals
        if (batch.length >= BATCH_SIZE) {
          self.postMessage({
            type: 'dataBatch',
            data: [...batch]
          });
          batch = [];
        }

        if (dataPoint.checkResult.isSafe) {
          maxSafeCurrent = current;
        } else {
          // Send any remaining points in batch
          if (batch.length > 0) {
            self.postMessage({
              type: 'dataBatch',
              data: [...batch]
            });
          }

          // Simulation ended
          const finalResult = {
            status: 'success',
            maxSafeCurrent: maxSafeCurrent,
            failureReason: dataPoint.checkResult.failureReason,
            details: dataPoint.checkResult.details,
            finalTemperature: dataPoint.checkResult.finalTemperature,
            powerDissipation: dataPoint.checkResult.powerDissipation,
          };

          self.postMessage({
            type: 'complete',
            result: finalResult
          });
          return;
        }
      }

      // Send any remaining points in batch
      if (batch.length > 0) {
        self.postMessage({
          type: 'dataBatch',
          data: [...batch]
        });
      }

      // Completed without failure
      const finalCheck = checkCurrent(maxSafeCurrent);
      const result = {
        status: 'success',
        maxSafeCurrent: maxSafeCurrent,
        failureReason: null,
        details: `Device operates safely up to ${maxSafeCurrent.toFixed(2)}A within all limits.`,
        finalTemperature: finalCheck.finalTemperature,
        powerDissipation: finalCheck.powerDissipation,
      };

      self.postMessage({
        type: 'complete',
        result: result
      });
    }
    
    // BINARY SEARCH ALGORITHM
    else {
      let low = 0;
      let high = maxCurrent * 1.5;
      let maxSafeCurrent = 0;
      let iterationCount = 0;
      const maxIterations = Math.log2(high - low) * 15;
      
      while (high - low >= 0.01 && iterationCount < maxIterations) {
        const mid = (low + high) / 2;
        if (mid <= 0) break;
        
        const dataPoint = addDataPoint(mid);
        
        // Send data point to main thread
        self.postMessage({
          type: 'dataPoint',
          data: dataPoint
        });
        
        if (dataPoint.checkResult.isSafe) {
          maxSafeCurrent = mid;
          low = mid;
        } else {
          high = mid;
        }
        
        iterationCount++;
      }
      
      const finalCheck = checkCurrent(maxSafeCurrent);
      const result = {
        status: 'success',
        maxSafeCurrent: maxSafeCurrent,
        failureReason: null,
        details: `Device operates safely up to ${maxSafeCurrent.toFixed(2)}A within all limits.`,
        finalTemperature: finalCheck.finalTemperature,
        powerDissipation: finalCheck.powerDissipation,
      };
      
      self.postMessage({
        type: 'complete',
        result: result
      });
    }
  };