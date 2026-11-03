
module memory_stage #(
    parameter ADDR_WIDTH = 10
)(
    input logic clk,
    input logic rst_n,
    input logic enable,
    input logic flush,

    // -----------------------------------------
    // EX/MEM register inputs
    // -----------------------------------------

    input logic [31:0] alu_result,
    input logic [31:0] store_data,
    input logic [31:0] pc_plus4,
    input logic [4:0] rd,

    input logic RegWrite,
    input logic MemRead,
    input logic MemWrite,
    input logic [1:0] ResultSrc,

    // -----------------------------------------
    // MEM/WB register outputs
    // -----------------------------------------

    output logic [31:0] wb_alu_result,
    output logic [31:0] wb_mem_read_data,
    output logic [31:0] wb_pc_plus4,

    output logic [4:0] wb_rd,

    output logic wb_RegWrite,
    output logic [1:0] wb_ResultSrc
);

    // -----------------------------------------
    // Internal Data Memory output
    // -----------------------------------------

    logic [31:0] mem_read_data;

    // -----------------------------------------
    // Data Memory
    // -----------------------------------------

    data_memory #(
        .ADDR_WIDTH(ADDR_WIDTH)
    ) data_mem (
        .clk(clk),
        .mem_read(MemRead),
        .mem_write(MemWrite),
        .address(alu_result),
        .write_data(store_data),
        .read_data(mem_read_data)
    );

    // -----------------------------------------
    // MEM/WB Pipeline Register
    // -----------------------------------------

    mem_wb_reg mem_wb_register (
        .clk(clk),
        .rst_n(rst_n),
        .flush(flush),
        .enable(enable),

        .alu_result_in(alu_result),
        .mem_read_data_in(mem_read_data),
        .pc_plus4_in(pc_plus4),

        .rd_in(rd),

        .RegWrite_in(RegWrite),
        .ResultSrc_in(ResultSrc),

        .alu_result_out(wb_alu_result),
        .mem_read_data_out(wb_mem_read_data),
        .pc_plus4_out(wb_pc_plus4),

        .rd_out(wb_rd),

        .RegWrite_out(wb_RegWrite),
        .ResultSrc_out(wb_ResultSrc)
    );

endmodule
