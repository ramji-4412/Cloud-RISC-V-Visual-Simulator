#ifndef RISCV_SIM_PROTOCOL_HPP
#define RISCV_SIM_PROTOCOL_HPP

#include <nlohmann/json.hpp>

#include <string>
#include <vector>
#include <optional>
#include <iostream>

using json = nlohmann::json;

// ------------------------------------------------------------------
// JSON request / response protocol for the persistent C++ simulation
// engine. One JSON object per line on stdin (request) and stdout
// (response). Diagnostic messages go to stderr.
// ------------------------------------------------------------------

namespace riscv_sim {

// Supported commands. Kept as strings for direct JSON serialization.
inline const char CMD_LOAD_PROGRAM[] = "load_program";
inline const char CMD_RESET[]        = "reset";
inline const char CMD_STEP[]         = "step";
inline const char CMD_RUN_CYCLES[]   = "run_cycles";
inline const char CMD_RUN[]          = "run";
inline const char CMD_READ_REGISTERS[] = "read_registers";
inline const char CMD_READ_MEMORY[]    = "read_memory";
inline const char CMD_PIPELINE_STATE[] = "get_pipeline_state";
inline const char CMD_STATUS[]       = "status";
inline const char CMD_QUIT[]         = "quit";
inline const char CMD_START_TRACE[]  = "start_trace";
inline const char CMD_STOP_TRACE[]   = "stop_trace";
inline const char CMD_TRACE_STATUS[] = "get_trace_status";

// ------------------------------------------------------------------
// Request
// ------------------------------------------------------------------

struct Request {
    std::string command;
    std::optional<std::string> program_file;
    std::optional<std::string> filename;
    std::optional<int> cycles;
    std::optional<int> max_cycles;
    std::optional<unsigned int> address;
    std::optional<unsigned int> words;
};

inline void to_json(json& j, const Request& r) {
    j = json{{"command", r.command}};
    if (r.program_file) j["program_file"] = *r.program_file;
    if (r.filename)      j["filename"] = *r.filename;
    if (r.cycles)       j["cycles"] = *r.cycles;
    if (r.max_cycles)   j["max_cycles"] = *r.max_cycles;
    if (r.address)      j["address"] = *r.address;
    if (r.words)        j["words"] = *r.words;
}

inline void from_json(const json& j, Request& r) {
    j.at("command").get_to(r.command);
    if (j.contains("program_file")) r.program_file = j["program_file"].get<std::string>();
    if (j.contains("filename"))      r.filename = j["filename"].get<std::string>();
    if (j.contains("cycles"))       r.cycles = j["cycles"].get<int>();
    if (j.contains("max_cycles"))   r.max_cycles = j["max_cycles"].get<int>();
    if (j.contains("address"))      r.address = j["address"].get<unsigned int>();
    if (j.contains("words"))        r.words = j["words"].get<unsigned int>();
}

// ------------------------------------------------------------------
// Response
// ------------------------------------------------------------------

struct Response {
    std::string status;   // "ok" or "error"
    std::string command;  // echo of the request command
    json data;            // command-specific payload (empty by default)
    std::optional<std::string> error;
};

inline void to_json(json& j, const Response& r) {
    j = json{{"status", r.status}, {"command", r.command}};
    if (!r.data.empty()) j["data"] = r.data;
    if (r.error) j["error"] = *r.error;
}

inline void from_json(const json& j, Response& r) {
    j.at("status").get_to(r.status);
    j.at("command").get_to(r.command);
    if (j.contains("data")) r.data = j["data"];
    if (j.contains("error")) r.error = j["error"].get<std::string>();
}

// ------------------------------------------------------------------
// I/O helpers
// ------------------------------------------------------------------

// Read one JSON request from stdin. Returns std::nullopt on EOF.
std::optional<Request> read_request();

// Write one JSON response to stdout.
void write_response(const Response& resp);

// Send an error response.
void send_error(const std::string& command, const std::string& message);

// Send an ok response with optional data payload.
void send_ok(const std::string& command, const json& data = json::object());

}  // namespace riscv_sim

#endif  // RISCV_SIM_PROTOCOL_HPP
