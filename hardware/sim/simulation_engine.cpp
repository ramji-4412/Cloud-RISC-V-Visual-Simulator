#include "simulation_engine.hpp"
#include "protocol.hpp"

#include <verilated.h>
#include <verilated_vcd_c.h>
#include "Vriscv_sim_top.h"

#include <iostream>
#include <stdexcept>

namespace riscv_sim {

SimulationEngine::SimulationEngine() {
    context_ = std::make_unique<VerilatedContext>();

    // traceEverOn must be called BEFORE any model is constructed for
    // Verilator VCD tracing to work. Verilator requirement.
    context_->traceEverOn(true);

    // Call commandArgs so that $value$plusargs works in RTL initial
    // blocks (e.g. instruction_memory.sv).
    const char* argv[] = {"Vriscv_sim_top"};
    context_->commandArgs(1, const_cast<char**>(argv));

    top_ = std::make_unique<Vriscv_sim_top>(context_.get());

    top_->clk = 0;
    top_->rst_n = 0;

    top_->eval();

    program_loaded_ = false;
    reset_applied_ = false;
    cycle_count_ = 0;
}

SimulationEngine::~SimulationEngine() {
    stopTrace();
    if (top_) {
        top_->final();
    }
}

json SimulationEngine::loadProgram(const std::string& program_file) {
    json result;

    try {
        reconstructModel(program_file);

        top_->rst_n = 0;
        top_->clk = 0;
        evalAndDump();
        top_->clk = 1;
        evalAndDump();
        cycle_count_ = 0;

        result["program_file"] = program_file;
        result["cycles"] = cycle_count_;
        result["program_loaded"] = true;

        return {{"status", "ok"}, {"command", "load_program"}, {"data", result}};
    } catch (const std::exception& e) {
        error_state_ = true;
        error_message_ = e.what();
        return {{"status", "error"}, {"command", "load_program"},
                {"error", error_message_}};
    }
}

json SimulationEngine::reset() {
    json result;

    try {
        applyResetSequence();

        result["cycles"] = cycle_count_;
        result["reset_applied"] = true;
        result["pipeline_state"] = getPipelineState()["data"];

        return {{"status", "ok"}, {"command", "reset"}, {"data", result}};
    } catch (const std::exception& e) {
        error_state_ = true;
        error_message_ = e.what();
        return {{"status", "error"}, {"command", "reset"},
                {"error", error_message_}};
    }
}

json SimulationEngine::step() {
    json result;

    try {
        if (!program_loaded_) {
            return {{"status", "error"}, {"command", "step"},
                    {"error", "no program loaded"}};
        }

        clockCycle();

        result["cycles"] = cycle_count_;
        result["pipeline_state"] = getPipelineState()["data"];

        return {{"status", "ok"}, {"command", "step"}, {"data", result}};
    } catch (const std::exception& e) {
        error_state_ = true;
        error_message_ = e.what();
        return {{"status", "error"}, {"command", "step"},
                {"error", error_message_}};
    }
}

json SimulationEngine::runCycles(int cycles) {
    json result;

    try {
        if (!program_loaded_) {
            return {{"status", "error"}, {"command", "run_cycles"},
                    {"error", "no program loaded"}};
        }

        if (cycles <= 0) {
            return {{"status", "error"}, {"command", "run_cycles"},
                    {"error", "cycle count must be positive"}};
        }

        int start_cycle = cycle_count_;
        for (int i = 0; i < cycles; i++) {
            clockCycle();
        }

        result["cycles"] = cycle_count_;
        result["cycles_executed"] = cycle_count_ - start_cycle;
        result["pipeline_state"] = getPipelineState()["data"];

        return {{"status", "ok"}, {"command", "run_cycles"}, {"data", result}};
    } catch (const std::exception& e) {
        error_state_ = true;
        error_message_ = e.what();
        return {{"status", "error"}, {"command", "run_cycles"},
                {"error", error_message_}};
    }
}

json SimulationEngine::run(int max_cycles) {
    json result = runCycles(max_cycles);
    if (result["status"] == "ok") {
        result["data"]["termination_reason"] = "max_cycles_reached";
        result["data"]["max_cycles"] = max_cycles;
    }
    result["command"] = "run";
    return result;
}

json SimulationEngine::readRegisters() {
    json result;

    try {
        if (!program_loaded_) {
            return {{"status", "error"}, {"command", "read_registers"},
                    {"error", "no program loaded"}};
        }

        json regs = json::array();
        for (int i = 0; i < 32; i++) {
            top_->debug_reg_addr = i;
            top_->eval();
            uint32_t val = top_->debug_reg_data;
            regs.push_back({{"register", "x" + std::to_string(i)},
                            {"index", i},
                            {"value", static_cast<uint32_t>(val)}});
        }

        result["registers"] = regs;
        result["cycles"] = cycle_count_;

        return {{"status", "ok"}, {"command", "read_registers"}, {"data", result}};
    } catch (const std::exception& e) {
        error_state_ = true;
        error_message_ = e.what();
        return {{"status", "error"}, {"command", "read_registers"},
                {"error", error_message_}};
    }
}

json SimulationEngine::readMemory(unsigned int address, unsigned int words) {
    json result;

    try {
        if (!program_loaded_) {
            return {{"status", "error"}, {"command", "read_memory"},
                    {"error", "no program loaded"}};
        }

        const unsigned int max_words = 1024;
        unsigned int start_word = address / 4;
        unsigned int end_word = start_word + words;

        if (start_word >= max_words) {
            return {{"status", "error"}, {"command", "read_memory"},
                    {"error", "start address out of range"}};
        }

        if (end_word > max_words) {
            end_word = max_words;
            words = end_word - start_word;
        }

        json mem = json::array();
        for (unsigned int i = 0; i < words; i++) {
            unsigned int byte_addr = (start_word + i) * 4;
            top_->debug_dmem_addr = byte_addr;
            top_->eval();
            uint32_t val = top_->debug_dmem_data;
            mem.push_back({{"address", byte_addr},
                           {"word_index", start_word + i},
                           {"value", static_cast<uint32_t>(val)}});
        }

        result["memory"] = mem;
        result["cycles"] = cycle_count_;

        return {{"status", "ok"}, {"command", "read_memory"}, {"data", result}};
    } catch (const std::exception& e) {
        error_state_ = true;
        error_message_ = e.what();
        return {{"status", "error"}, {"command", "read_memory"},
                {"error", error_message_}};
    }
}

json SimulationEngine::getPipelineState() {
    json result;

    try {
        json state;
        state["fetch_pc"] = static_cast<uint32_t>(top_->debug_fetch_pc);
        state["fetch_instruction"] = static_cast<uint32_t>(top_->debug_fetch_instruction);

        state["if_id_pc"] = static_cast<uint32_t>(top_->debug_if_id_pc);
        state["if_id_instruction"] = static_cast<uint32_t>(top_->debug_if_id_instruction);

        state["id_rs1_data"] = static_cast<uint32_t>(top_->debug_id_rs1_data);
        state["id_rs2_data"] = static_cast<uint32_t>(top_->debug_id_rs2_data);
        state["id_imm"] = static_cast<uint32_t>(top_->debug_id_imm);

        state["ex_pc"] = static_cast<uint32_t>(top_->debug_ex_pc);
        state["ex_rd"] = static_cast<unsigned int>(top_->debug_ex_rd);
        state["ex_opcode"] = static_cast<unsigned int>(top_->debug_ex_opcode);

        state["mem_alu_result"] = static_cast<uint32_t>(top_->debug_mem_alu_result);
        state["mem_store_data"] = static_cast<uint32_t>(top_->debug_mem_store_data);
        state["mem_rd"] = static_cast<unsigned int>(top_->debug_mem_rd);

        state["wb_writeback_data"] = static_cast<uint32_t>(top_->debug_wb_writeback_data);
        state["wb_writeback_rd"] = static_cast<unsigned int>(top_->debug_wb_writeback_rd);
        state["wb_writeback_enable"] = top_->debug_wb_writeback_enable;

        state["control_stall"] = top_->debug_control_stall;
        state["redirect"] = top_->debug_redirect;
        state["pc_sel"] = static_cast<unsigned int>(top_->debug_pc_sel);

        state["cycle"] = cycle_count_;

        result["state"] = state;

        return {{"status", "ok"}, {"command", "get_pipeline_state"}, {"data", result}};
    } catch (const std::exception& e) {
        error_state_ = true;
        error_message_ = e.what();
        return {{"status", "error"}, {"command", "get_pipeline_state"},
                {"error", error_message_}};
    }
}

json SimulationEngine::getStatus() {
    json data;
    data["engine"] = "Verilator";
    data["model_initialized"] = (top_ != nullptr);
    data["program_loaded"] = program_loaded_;
    data["program_file"] = program_loaded_ ? json(program_file_) : nullptr;
    data["reset_applied"] = reset_applied_;
    data["cycle_count"] = cycle_count_;
    data["trace_enabled"] = trace_enabled_;
    data["error"] = error_state_;
    if (error_state_) {
        data["error_message"] = error_message_;
    }

    return {{"status", "ok"}, {"command", "status"}, {"data", data}};
}

json SimulationEngine::getTraceStatus() {
    json data;
    data["trace_enabled"] = trace_enabled_;
    data["trace_file"] = trace_enabled_ ? json(trace_file_) : nullptr;
    return {{"status", "ok"}, {"command", "get_trace_status"}, {"data", data}};
}

void SimulationEngine::startTrace(const std::string& filename) {
    if (trace_enabled_) {
        stopTrace();
    }

    context_->traceEverOn(true);
    trace_ = std::make_unique<VerilatedVcdC>();
    top_->trace(trace_.get(), 99);
    trace_->open(filename.c_str());

    trace_file_ = filename;
    trace_enabled_ = true;
}

void SimulationEngine::stopTrace() {
    if (trace_enabled_ && trace_) {
        trace_->close();
        trace_.reset();
        trace_enabled_ = false;
    }
}

void SimulationEngine::clockCycle() {
    top_->clk = 0;
    evalAndDump();

    top_->clk = 1;
    evalAndDump();

    cycle_count_++;
}

void SimulationEngine::applyResetSequence() {
    top_->rst_n = 0;
    for (int i = 0; i < 2; i++) {
        clockCycle();
    }

    top_->rst_n = 1;
    clockCycle();

    reset_applied_ = true;
}

void SimulationEngine::evalAndDump() {
    top_->eval();
    if (trace_enabled_ && trace_) {
        trace_->dump(context_->time());
    }
    context_->timeInc(5);
}

void SimulationEngine::reconstructModel(const std::string& program_file) {
    stopTrace();

    context_args_.clear();
    context_args_.push_back("Vriscv_sim_top");
    context_args_.push_back("+program=" + program_file);

    std::vector<char*> argv;
    argv.reserve(context_args_.size());
    for (auto& a : context_args_) {
        argv.push_back(const_cast<char*>(a.c_str()));
    }

    // Finalize the old model before destroying it.
    if (top_) {
        top_->final();
    }

    top_.reset();
    context_ = std::make_unique<VerilatedContext>();
    // traceEverOn must be called BEFORE any model is constructed.
    context_->traceEverOn(true);
    context_->commandArgs(static_cast<int>(argv.size()), argv.data());

    top_ = std::make_unique<Vriscv_sim_top>(context_.get());

    top_->clk = 0;
    top_->rst_n = 0;

    top_->eval();

    program_file_ = program_file;
    program_loaded_ = true;
    reset_applied_ = false;
    cycle_count_ = 0;
    error_state_ = false;
    error_message_.clear();

    if (!trace_file_.empty()) {
        startTrace(trace_file_);
    }
}

}  // namespace riscv_sim
