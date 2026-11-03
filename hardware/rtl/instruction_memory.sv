
module instruction_memory #(
    parameter ADDR_WIDTH = 10
)(
    input logic [31:0] pc,
    output logic [31:0] instruction
);

    logic [31:0] memory [0:(1 << ADDR_WIDTH)-1];

`ifdef VERILATOR

    integer i;
    string program_file;

    // Simulation-only program initialization.
    initial begin

        // Initialize unused memory locations with RISC-V NOP.
        for (i = 0; i < (1 << ADDR_WIDTH); i = i + 1)
            memory[i] = 32'h00000013;

        // Load program when a filename is supplied.
        if ($value$plusargs("program=%s", program_file)) begin
            $readmemh(program_file, memory);
        end

    end

`endif

    // Combinational instruction fetch.
    always_comb begin
        if (pc[1:0] == 2'b00)
            instruction = memory[pc[ADDR_WIDTH+1:2]];
        else
            instruction = 32'h00000013;
    end

endmodule
