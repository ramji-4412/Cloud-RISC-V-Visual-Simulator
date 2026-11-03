
module writeback_stage (

    // MEM/WB pipeline register inputs
    input logic [31:0] alu_result,
    input logic [31:0] mem_read_data,
    input logic [31:0] pc_plus4,

    input logic [4:0] rd,
    input logic RegWrite,
    input logic [1:0] ResultSrc,

    // Register file write interface
    output logic [31:0] writeback_data,
    output logic [4:0] writeback_rd,
    output logic writeback_enable

);

    // -----------------------------------------
    // Writeback MUX
    // -----------------------------------------

    writeback_mux wb_mux (
        .alu_result(alu_result),
        .mem_read_data(mem_read_data),
        .pc_plus4(pc_plus4),
        .result_src(ResultSrc),
        .writeback_data(writeback_data)
    );

    // -----------------------------------------
    // Register File Write Control
    // -----------------------------------------

    always_comb begin
        writeback_rd = rd;
        writeback_enable = RegWrite;
    end

endmodule
