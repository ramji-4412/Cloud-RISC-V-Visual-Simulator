
module regfile (

    input  logic        clk,

    // Write port
    input  logic        we,
    input  logic [4:0]  rd,
    input  logic [31:0] write_data,

    // Read ports
    input  logic [4:0]  rs1,
    input  logic [4:0]  rs2,

    output logic [31:0] read_data1,
    output logic [31:0] read_data2

);

    // 32 registers, each 32 bits wide
    logic [31:0] registers [0:31];

`ifdef VERILATOR

    // Simulation-only register file initialization.
    // Zero all registers at time 0 for deterministic Verilator simulation.
    // Matches the hierarchical zeroing previously done in the testbench.
    initial begin
        for (int i = 0; i < 32; i = i + 1)
            registers[i] = 32'b0;
    end

`endif

    // Synchronous write operation
    always_ff @(posedge clk) begin

        if (we && (rd != 5'd0)) begin
            registers[rd] <= write_data;
        end

    end

    // Asynchronous read operation
    always_comb begin

        // x0 is hardwired to zero
        read_data1 = (rs1 == 5'd0) ? 32'b0 : registers[rs1];

        read_data2 = (rs2 == 5'd0) ? 32'b0 : registers[rs2];

    end

endmodule
