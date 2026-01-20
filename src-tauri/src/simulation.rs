use serde::{Deserialize, Serialize};

/// Transistor type enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TransistorType {
    NChannelMosfet,
    PChannelMosfet,
    GaNFet,
    NpnBjt,
    PnpBjt,
    Igbt,
}

impl TransistorType {
    pub fn is_mosfet_type(&self) -> bool {
        matches!(
            self,
            TransistorType::NChannelMosfet
                | TransistorType::PChannelMosfet
                | TransistorType::GaNFet
        )
    }

    pub fn from_string(s: &str) -> Self {
        match s {
            s if s.contains("MOSFET") && s.contains("N-Channel") => TransistorType::NChannelMosfet,
            s if s.contains("MOSFET") && s.contains("P-Channel") => TransistorType::PChannelMosfet,
            s if s.contains("GaN") => TransistorType::GaNFet,
            s if s.contains("NPN") => TransistorType::NpnBjt,
            s if s.contains("PNP") => TransistorType::PnpBjt,
            s if s.contains("IGBT") => TransistorType::Igbt,
            _ => TransistorType::NChannelMosfet, // Default
        }
    }
}

/// Simulation mode enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SimulationMode {
    Ftf,    // First-to-fail
    Temp,   // Temperature limit only
    Budget, // Cooling budget only
}

/// Simulation algorithm enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SimulationAlgorithm {
    Iterative,
    Binary,
}

/// Input parameters for the simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationParams {
    pub max_current: f64,
    pub max_voltage: f64,
    pub power_dissipation: Option<f64>,
    pub rth_jc: f64,
    pub rise_time: f64,  // nanoseconds
    pub fall_time: f64,  // nanoseconds
    pub switching_frequency: f64, // kHz
    pub max_temperature: f64,
    pub ambient_temperature: f64,
    pub total_rth: f64,
    pub transistor_type: String,
    pub rds_on_ohms: f64,
    pub vce_sat: Option<f64>,
    pub simulation_mode: SimulationMode,
    pub cooling_budget: Option<f64>,
    pub simulation_algorithm: SimulationAlgorithm,
    pub precision_steps: u32,
    pub effective_cooling_budget: f64,
}

/// Power dissipation breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerDissipation {
    pub total: f64,
    pub conduction: f64,
    pub switching: f64,
}

/// Result of checking a specific current level
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub is_safe: bool,
    pub failure_reason: Option<String>,
    pub details: String,
    pub final_temperature: f64,
    pub power_dissipation: PowerDissipation,
}

/// A single data point from the simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPoint {
    pub current: f64,
    pub temperature: f64,
    pub power_loss: f64,
    pub conduction_loss: f64,
    pub switching_loss: f64,
    pub progress: f64,
    pub limit_value: f64,
    pub check_result: CheckResult,
}

/// Final simulation result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationResult {
    pub status: String,
    pub max_safe_current: f64,
    pub failure_reason: Option<String>,
    pub details: String,
    pub final_temperature: f64,
    pub power_dissipation: PowerDissipation,
    pub data_points: Vec<DataPoint>,
}

/// Core simulation engine
pub struct SimulationEngine {
    params: SimulationParams,
    transistor_type: TransistorType,
}

impl SimulationEngine {
    pub fn new(params: SimulationParams) -> Self {
        let transistor_type = TransistorType::from_string(&params.transistor_type);
        Self {
            params,
            transistor_type,
        }
    }

    /// Check if a given current level is safe
    fn check_current(&self, current: f64) -> CheckResult {
        // Calculate conduction loss
        let p_cond = if self.transistor_type.is_mosfet_type() {
            current.powi(2) * self.params.rds_on_ohms * 0.5
        } else {
            current * self.params.vce_sat.unwrap_or(0.0) * 0.5
        };

        // Calculate switching loss
        let rise_fall_sum = (self.params.rise_time + self.params.fall_time) * 1e-9;
        let freq_hz = self.params.switching_frequency * 1000.0;
        let p_sw = 0.5 * self.params.max_voltage * current * rise_fall_sum * freq_hz;

        // Total power and temperature
        let p_total = p_cond + p_sw;
        let temp_rise = p_total * self.params.total_rth;
        let final_temp = self.params.ambient_temperature + temp_rise;

        // Determine failure conditions
        let (failure_reason, details) = self.determine_failure(
            current,
            final_temp,
            p_total,
        );

        let is_safe = match self.params.simulation_mode {
            SimulationMode::Temp => final_temp <= self.params.max_temperature,
            SimulationMode::Budget => p_total <= self.params.effective_cooling_budget,
            SimulationMode::Ftf => failure_reason.is_none(),
        };

        CheckResult {
            is_safe,
            failure_reason,
            details,
            final_temperature: final_temp,
            power_dissipation: PowerDissipation {
                total: p_total,
                conduction: p_cond,
                switching: p_sw,
            },
        }
    }

    /// Determine the failure reason and details
    fn determine_failure(
        &self,
        current: f64,
        final_temp: f64,
        p_total: f64,
    ) -> (Option<String>, String) {
        if final_temp > self.params.max_temperature {
            (
                Some("Thermal".to_string()),
                format!(
                    "Exceeded max junction temp of {}°C. Reached {:.2}°C.",
                    self.params.max_temperature, final_temp
                ),
            )
        } else if let Some(pd) = self.params.power_dissipation {
            if p_total > pd {
                (
                    Some("Power Dissipation".to_string()),
                    format!(
                        "Exceeded component's max power dissipation of {}W. Reached {:.2}W.",
                        pd, p_total
                    ),
                )
            } else {
                self.check_other_limits(current, p_total)
            }
        } else {
            self.check_other_limits(current, p_total)
        }
    }

    fn check_other_limits(&self, current: f64, p_total: f64) -> (Option<String>, String) {
        if self.params.simulation_mode != SimulationMode::Temp
            && p_total > self.params.effective_cooling_budget
        {
            (
                Some("Cooling Budget".to_string()),
                format!(
                    "Exceeded cooling budget of {}W. Reached {:.2}W.",
                    self.params.effective_cooling_budget, p_total
                ),
            )
        } else if current > self.params.max_current {
            (
                Some("Current".to_string()),
                format!(
                    "Exceeded max current rating of {:.2}A.",
                    self.params.max_current
                ),
            )
        } else {
            (None, "Operating within safe limits.".to_string())
        }
    }

    /// Create a data point for a given current
    fn create_data_point(&self, current: f64) -> DataPoint {
        let check_result = self.check_current(current);

        let (progress, limit_value) = match self.params.simulation_mode {
            SimulationMode::Temp => {
                let progress = (check_result.final_temperature / self.params.max_temperature) * 100.0;
                (progress, self.params.max_temperature)
            }
            SimulationMode::Budget => {
                let progress = (check_result.power_dissipation.total
                    / self.params.effective_cooling_budget)
                    * 100.0;
                (progress, self.params.effective_cooling_budget)
            }
            SimulationMode::Ftf => {
                let temp_progress =
                    (check_result.final_temperature / self.params.max_temperature) * 100.0;
                let power_progress = self
                    .params
                    .power_dissipation
                    .map(|pd| (check_result.power_dissipation.total / pd) * 100.0)
                    .unwrap_or(0.0);
                let budget_progress = (check_result.power_dissipation.total
                    / self.params.effective_cooling_budget)
                    * 100.0;
                let current_progress = (current / self.params.max_current) * 100.0;

                let progress = temp_progress
                    .max(power_progress)
                    .max(budget_progress)
                    .max(current_progress);
                (progress, 100.0)
            }
        };

        DataPoint {
            current,
            temperature: check_result.final_temperature,
            power_loss: check_result.power_dissipation.total,
            conduction_loss: check_result.power_dissipation.conduction,
            switching_loss: check_result.power_dissipation.switching,
            progress: progress.min(100.0),
            limit_value,
            check_result,
        }
    }

    /// Run the iterative simulation algorithm
    pub fn run_iterative(&self) -> SimulationResult {
        let max_current_range = self.params.max_current * 1.2;
        let mut max_safe_current = 0.0;
        let mut data_points = Vec::with_capacity(self.params.precision_steps as usize + 1);
        let mut final_data_point: Option<DataPoint> = None;

        for i in 0..=self.params.precision_steps {
            let current = i as f64 * (max_current_range / self.params.precision_steps as f64);
            let data_point = self.create_data_point(current);

            if data_point.check_result.is_safe {
                max_safe_current = current;
                data_points.push(data_point);
            } else {
                data_points.push(data_point.clone());
                final_data_point = Some(data_point);
                break;
            }
        }

        if let Some(dp) = final_data_point {
            SimulationResult {
                status: "success".to_string(),
                max_safe_current,
                failure_reason: dp.check_result.failure_reason,
                details: dp.check_result.details,
                final_temperature: dp.check_result.final_temperature,
                power_dissipation: dp.check_result.power_dissipation,
                data_points,
            }
        } else {
            let final_check = self.check_current(max_safe_current);
            SimulationResult {
                status: "success".to_string(),
                max_safe_current,
                failure_reason: None,
                details: format!(
                    "Device operates safely up to {:.2}A within all limits.",
                    max_safe_current
                ),
                final_temperature: final_check.final_temperature,
                power_dissipation: final_check.power_dissipation,
                data_points,
            }
        }
    }

    /// Run the binary search simulation algorithm
    pub fn run_binary_search(&self) -> SimulationResult {
        let mut low = 0.0;
        let mut high = self.params.max_current * 1.5;
        let mut max_safe_current = 0.0;
        let max_iterations = ((high - low).log2() * 15.0) as u32;
        let mut data_points = Vec::new();

        for _ in 0..max_iterations {
            if high - low < 0.01 {
                break;
            }

            let mid = (low + high) / 2.0;
            if mid <= 0.0 {
                break;
            }

            let data_point = self.create_data_point(mid);
            data_points.push(data_point.clone());

            if data_point.check_result.is_safe {
                max_safe_current = mid;
                low = mid;
            } else {
                high = mid;
            }
        }

        // Sort data points by current for visualization
        data_points.sort_by(|a, b| a.current.partial_cmp(&b.current).unwrap());

        let final_check = self.check_current(max_safe_current);
        SimulationResult {
            status: "success".to_string(),
            max_safe_current,
            failure_reason: None,
            details: format!(
                "Device operates safely up to {:.2}A within all limits.",
                max_safe_current
            ),
            final_temperature: final_check.final_temperature,
            power_dissipation: final_check.power_dissipation,
            data_points,
        }
    }

    /// Run the simulation with the configured algorithm
    pub fn run(&self) -> SimulationResult {
        match self.params.simulation_algorithm {
            SimulationAlgorithm::Iterative => self.run_iterative(),
            SimulationAlgorithm::Binary => self.run_binary_search(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_params() -> SimulationParams {
        SimulationParams {
            max_current: 49.0,
            max_voltage: 55.0,
            power_dissipation: Some(94.0),
            rth_jc: 1.0,
            rise_time: 60.0,
            fall_time: 45.0,
            switching_frequency: 100.0,
            max_temperature: 150.0,
            ambient_temperature: 25.0,
            total_rth: 1.5,
            transistor_type: "MOSFET (N-Channel)".to_string(),
            rds_on_ohms: 0.0175, // 17.5 mOhm
            vce_sat: None,
            simulation_mode: SimulationMode::Ftf,
            cooling_budget: None,
            simulation_algorithm: SimulationAlgorithm::Iterative,
            precision_steps: 200,
            effective_cooling_budget: 250.0,
        }
    }

    #[test]
    fn test_simulation_runs() {
        let params = create_test_params();
        let engine = SimulationEngine::new(params);
        let result = engine.run();

        assert_eq!(result.status, "success");
        assert!(result.max_safe_current > 0.0);
        assert!(!result.data_points.is_empty());
    }

    #[test]
    fn test_binary_search() {
        let mut params = create_test_params();
        params.simulation_algorithm = SimulationAlgorithm::Binary;

        let engine = SimulationEngine::new(params);
        let result = engine.run();

        assert_eq!(result.status, "success");
        assert!(result.max_safe_current > 0.0);
    }

    #[test]
    fn test_check_current() {
        let params = create_test_params();
        let engine = SimulationEngine::new(params);

        // Low current should be safe
        let result = engine.check_current(5.0);
        assert!(result.is_safe);

        // Very high current should fail
        let result = engine.check_current(100.0);
        assert!(!result.is_safe);
    }
}
