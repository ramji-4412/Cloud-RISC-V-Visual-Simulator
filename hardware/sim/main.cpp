
#include <iostream>
#include <memory>
#include <string>

#include "simulation_engine.hpp"
#include "protocol.hpp"

using riscv_sim::SimulationEngine;
using riscv_sim::read_request;
using riscv_sim::write_response;
using riscv_sim::send_ok;
using riscv_sim::send_error;

int main(int argc, char** argv) {

    // Create the persistent simulation engine.
    auto engine = std::make_unique<SimulationEngine>();

    std::cerr << "RISC-V simulation engine ready." << std::endl;

    // Main command loop: read JSON from stdin, respond on stdout.
    while (true) {
        auto req = read_request();
        if (!req.has_value()) {
            // EOF or unrecoverable read error.
            break;
        }

        if (req->command == "quit") {
            send_ok(req->command);
            break;
        }

        const std::string& cmd = req->command;

        if (cmd == "status") {
            write_response(engine->getStatus());
            continue;
        }

        if (cmd == "load_program") {
            if (!req->program_file) {
                send_error(cmd, "missing 'program_file' parameter");
                continue;
            }
            write_response(engine->loadProgram(*req->program_file));
            continue;
        }

        if (cmd == "reset") {
            write_response(engine->reset());
            continue;
        }

        if (cmd == "step") {
            write_response(engine->step());
            continue;
        }

        if (cmd == "run_cycles") {
            if (!req->cycles) {
                send_error(cmd, "missing 'cycles' parameter");
                continue;
            }
            write_response(engine->runCycles(*req->cycles));
            continue;
        }

        if (cmd == "run") {
            int max_cycles = req->max_cycles.value_or(100);
            write_response(engine->run(max_cycles));
            continue;
        }

        if (cmd == "read_registers") {
            write_response(engine->readRegisters());
            continue;
        }

        if (cmd == "read_memory") {
            if (!req->address || !req->words) {
                send_error(cmd, "missing 'address' or 'words' parameter");
                continue;
            }
            write_response(engine->readMemory(*req->address, *req->words));
            continue;
        }

        if (cmd == "get_pipeline_state") {
            write_response(engine->getPipelineState());
            continue;
        }

        if (cmd == "start_trace") {
            std::string fname = req->filename.value_or("pipeline.vcd");
            json result;
            try {
                engine->startTrace(fname);
                result = json{{"trace_file", fname}, {"trace_enabled", true}};
                send_ok(cmd, result);
            } catch (const std::exception& e) {
                send_error(cmd, e.what());
            }
            continue;
        }

        if (cmd == "stop_trace") {
            engine->stopTrace();
            json result = json{{"trace_enabled", false}, {"trace_file", nullptr}};
            send_ok(cmd, result);
            continue;
        }

        if (cmd == "get_trace_status") {
            write_response(engine->getTraceStatus());
            continue;
        }

        // Unknown command.
        send_error(cmd, "unknown command");
    }

    std::cerr << "RISC-V simulation engine shutting down." << std::endl;
    return 0;
}
