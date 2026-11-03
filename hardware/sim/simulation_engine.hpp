#ifndef RISCV_SIM_SIMULATION_ENGINE_HPP
#define RISCV_SIM_SIMULATION_ENGINE_HPP

#include <nlohmann/json.hpp>

#include <memory>
#include <string>
#include <vector>
#include <cstdint>

using json = nlohmann::json;

// Forward declarations for Verilator types.
class VerilatedContext;
class VerilatedVcdC;
class Vriscv_sim_top;

namespace riscv_sim {

// Persistent simulation engine wrapping the Verilator-generated
// SystemVerilog RV32I processor model.
//
// The engine remains alive across multiple commands. Program loading
// reconstructs the model (since $readmemh initial blocks only execute
// at construction time). Clock, reset, tracing, and cycle counting are
// all managed internally.
class SimulationEngine {
public:
    SimulationEngine();
    ~SimulationEngine();

    // Disable copy/move.
    SimulationEngine(const SimulationEngine&) = delete;
    SimulationEngine& operator=(const SimulationEngine&) = delete;

    // ---------------------------------------------------------------
    // Program / reset control
    // ---------------------------------------------------------------

    // Load a program into instruction memory. Reconstructs the
    // Verilator model so that $readmemh runs with the new file.
    // Returns status info including the program file loaded.
    json loadProgram(const std::string& program_file);

    // Apply the processor reset sequence (2 cycles with rst_n=0,
    // then release). Returns post-reset pipeline state.
    json reset();

    // ---------------------------------------------------------------
    // Execution control
    // ---------------------------------------------------------------

    // Advance exactly one complete clock cycle.
    json step();

    // Advance exactly `cycles` clock cycles.
    json runCycles(int cycles);

    // Run up to `max_cycles` cycles. There is no halt instruction in
    // the current RV32I subset, so this simply runs max_cycles and
    // returns "max_cycles_reached" as the termination reason.
    json run(int max_cycles);

    // ---------------------------------------------------------------
    // State inspection
    // ---------------------------------------------------------------

    // Read all 32 general-purpose registers. x0 always reads as 0.
    json readRegisters();

    // Read `words` data-memory words starting at byte `address`.
    // Bounds-checked against the data memory size.
    json readMemory(unsigned int address, unsigned int words);

    // Read the full pipeline state from all debug outputs.
    json getPipelineState();

    // Return simulator status (engine, cycle count, program loaded,
    // reset applied, tracing enabled, errors).
    json getStatus();

    // ---------------------------------------------------------------
    // Waveform tracing
    // ---------------------------------------------------------------

    // Open a VCD trace file. Call before running cycles if you want
    // waveform output.
    void startTrace(const std::string& filename);

    // Close the VCD trace file cleanly.
    void stopTrace();

    // Return whether tracing is currently active and the trace file.
    json getTraceStatus();

    // Current cycle count.
    int cycleCount() const { return cycle_count_; }

private:
    // Drive one complete clock cycle (falling + rising edge).
    void clockCycle();

    // Apply reset for 2 cycles then release.
    void applyResetSequence();

    // Evaluate the model and dump to trace (caller sets clk/rst_n).
    void evalAndDump();

    // Reconstruct the Verilator model with a new program plusarg.
    void reconstructModel(const std::string& program_file);

    // ---------------------------------------------------------------
    // Members
    // ---------------------------------------------------------------

    std::unique_ptr<VerilatedContext> context_;
    std::unique_ptr<Vriscv_sim_top> top_;
    std::unique_ptr<VerilatedVcdC> trace_;

    std::vector<std::string> context_args_;  // keep alive for commandArgs

    std::string program_file_;
    std::string trace_file_;
    bool trace_enabled_ = false;
    bool program_loaded_ = false;
    bool reset_applied_ = false;
    bool error_state_ = false;
    std::string error_message_;
    int cycle_count_ = 0;
};

}  // namespace riscv_sim

#endif  // RISCV_SIM_SIMULATION_ENGINE_HPP
