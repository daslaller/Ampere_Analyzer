mod simulation;

use simulation::{SimulationEngine, SimulationParams, SimulationResult};

/// Run the transistor simulation with the given parameters
/// This is the main Tauri command that replaces the Web Worker
#[tauri::command]
fn run_simulation(params: SimulationParams) -> Result<SimulationResult, String> {
    let engine = SimulationEngine::new(params);
    Ok(engine.run())
}

/// Get application version
#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![run_simulation, get_version])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
