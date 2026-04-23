<script lang="ts">
  import type { HistoryEntry } from '@/lib/types';

  export let history: HistoryEntry[] = [];
  export let onClear: () => void;
</script>

<div class="history-shell">
  <div class="history-actions">
    <div>
      <h3>Simulation History</h3>
      <p>Stored locally in the browser for quick re-checks.</p>
    </div>
    <button class="button ghost" on:click={onClear} disabled={history.length === 0}>Clear History</button>
  </div>

  {#if history.length === 0}
    <div class="empty-state">
      <strong>No runs stored yet.</strong>
      <span>Once we run a simulation, the most recent fifty entries will appear here.</span>
    </div>
  {:else}
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Status</th>
            <th>Limit</th>
            <th>Max Safe Current</th>
            <th>Final Temp</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {#each history as entry}
            <tr>
              <td>{entry.componentName}</td>
              <td>{entry.result.analysisStatus}</td>
              <td>{entry.result.limitingFactor ?? 'None in sweep'}</td>
              <td>{entry.result.maxSafeCurrent.toFixed(2)} A</td>
              <td>{entry.result.finalTemperature.toFixed(2)} C</td>
              <td>{new Date(entry.timestamp).toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
