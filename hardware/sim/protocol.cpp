#include "protocol.hpp"

#include <string>

namespace riscv_sim {

std::optional<Request> read_request() {
    std::string line;
    if (!std::getline(std::cin, line)) {
        return std::nullopt;
    }
    if (line.empty()) {
        return std::nullopt;
    }
    try {
        json j = json::parse(line);
        Request req;
        j.get_to(req);
        return req;
    } catch (const json::parse_error& e) {
        std::cerr << "JSON parse error: " << e.what() << std::endl;
        return std::nullopt;
    } catch (const json::exception& e) {
        std::cerr << "JSON error: " << e.what() << std::endl;
        return std::nullopt;
    }
}

void write_response(const Response& resp) {
    json j;
    to_json(j, resp);
    std::cout << j.dump() << std::endl;
    std::cout.flush();
}

void send_error(const std::string& command, const std::string& message) {
    Response resp;
    resp.status = "error";
    resp.command = command;
    resp.error = message;
    write_response(resp);
}

void send_ok(const std::string& command, const json& data) {
    Response resp;
    resp.status = "ok";
    resp.command = command;
    resp.data = data;
    write_response(resp);
}

}  // namespace riscv_sim
