
module data_memory #(
    parameter ADDR_WIDTH = 10
)(
    input  logic        clk,
    input  logic        mem_read,
    input  logic        mem_write,
    input  logic [31:0] address,
    input  logic [31:0] write_data,
    output logic [31:0] read_data
);

    // 2^ADDR_WIDTH words, each 32 bits wide
    logic [31:0] memory [0:(1 << ADDR_WIDTH)-1];

`ifdef VERILATOR

    // Simulation-only data memory initialization.
    // Zero all memory locations at time 0 for deterministic Verilator simulation.
    // Matches the hierarchical zeroing previously done in the testbench.
    initial begin
        for (int i = 0; i < (1 << ADDR_WIDTH); i = i + 1)
            memory[i] = 32'b0;
    end

`endif

    // Combinational read
    always_comb begin
        if (mem_read && address[1:0] == 2'b00)
            read_data = memory[address[ADDR_WIDTH+1:2]];
        else
            read_data = 32'b0;
    end

    // Synchronous write
    always_ff @(posedge clk) begin
        if (mem_write && address[1:0] == 2'b00)
            memory[address[ADDR_WIDTH+1:2]] <= write_data;
    end

endmodule
