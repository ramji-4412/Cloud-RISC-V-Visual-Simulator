
module execute_memory_register (
    input logic clk,
    input logic rst_n,
    input logic enable,
    input logic flush,

    // ID/EX data and instruction fields
    input logic [31:0] pc,
    input logic [31:0] pc_plus4,
    input logic [31:0] rs1_data,
    input logic [31:0] rs2_data,
    input logic [31:0] imm,

    input logic [4:0] rs1,
    input logic [4:0] rs2,
    input logic [4:0] rd,

    input logic [2:0] funct3,
    input logic [6:0] opcode,

    // ID/EX control signals
    input logic RegWrite,
    input logic ALUSrc,
    input logic MemRead,
    input logic MemWrite,
    input logic [1:0] ResultSrc,
    input logic Branch,
    input logic Jump,
    input logic [3:0] ALUControl,

    // EX/MEM forwarding inputs
    input logic [4:0] rd_mem,
    input logic regwrite_mem,
    input logic memread_mem,
    input logic [31:0] alu_result_mem,

    // MEM/WB forwarding inputs
    input logic [4:0] rd_wb,
    input logic regwrite_wb,
    input logic [31:0] wb_write_data,

    // Branch and jump outputs
    output logic branch_taken,
    output logic jalr,
    output logic [1:0] pc_sel,
    output logic [31:0] branch_target,
    output logic [31:0] jal_target,
    output logic [31:0] jalr_target,

    // EX/MEM registered outputs
    output logic [31:0] mem_pc_plus4,
    output logic [31:0] mem_alu_result,
    output logic [31:0] mem_store_data,
    output logic [4:0] mem_rd,

    output logic mem_RegWrite,
    output logic mem_MemRead,
    output logic mem_MemWrite,
    output logic [1:0] mem_ResultSrc
);

    // -----------------------------------------
    // Execute Stage outputs
    // -----------------------------------------

    logic [31:0] ex_alu_result;
    logic [31:0] ex_store_data;
    logic [31:0] ex_pc_plus4;
    logic [4:0] ex_rd;

    logic ex_RegWrite;
    logic ex_MemRead;
    logic ex_MemWrite;
    logic [1:0] ex_ResultSrc;

    // -----------------------------------------
    // Execute Stage
    // -----------------------------------------

    execute_stage execute_unit (
        .pc(pc),
        .pc_plus4(pc_plus4),
        .rs1_data(rs1_data),
        .rs2_data(rs2_data),
        .imm(imm),

        .rs1(rs1),
        .rs2(rs2),
        .rd(rd),

        .funct3(funct3),
        .opcode(opcode),

        .RegWrite(RegWrite),
        .ALUSrc(ALUSrc),
        .MemRead(MemRead),
        .MemWrite(MemWrite),
        .ResultSrc(ResultSrc),
        .Branch(Branch),
        .Jump(Jump),
        .ALUControl(ALUControl),

        .rd_mem(rd_mem),
        .regwrite_mem(regwrite_mem),
        .memread_mem(memread_mem),
        .alu_result_mem(alu_result_mem),

        .rd_wb(rd_wb),
        .regwrite_wb(regwrite_wb),
        .wb_write_data(wb_write_data),

        .alu_result(ex_alu_result),
        .store_data(ex_store_data),
        .pc_plus4_out(ex_pc_plus4),
        .rd_out(ex_rd),

        .branch_taken(branch_taken),
        .jalr(jalr),
        .pc_sel(pc_sel),

        .branch_target(branch_target),
        .jal_target(jal_target),
        .jalr_target(jalr_target),

        .RegWrite_out(ex_RegWrite),
        .MemRead_out(ex_MemRead),
        .MemWrite_out(ex_MemWrite),
        .ResultSrc_out(ex_ResultSrc)
    );

    // -----------------------------------------
    // EX/MEM Pipeline Register
    // -----------------------------------------

    ex_mem_reg ex_mem_register (
        .clk(clk),
        .rst_n(rst_n),
        .enable(enable),
        .flush(flush),

        .pc_plus4_in(ex_pc_plus4),
        .alu_result_in(ex_alu_result),
        .rs2_data_in(ex_store_data),

        .rd_in(ex_rd),

        .RegWrite_in(ex_RegWrite),
        .MemRead_in(ex_MemRead),
        .MemWrite_in(ex_MemWrite),
        .ResultSrc_in(ex_ResultSrc),

        .pc_plus4_out(mem_pc_plus4),
        .alu_result_out(mem_alu_result),
        .rs2_data_out(mem_store_data),

        .rd_out(mem_rd),

        .RegWrite_out(mem_RegWrite),
        .MemRead_out(mem_MemRead),
        .MemWrite_out(mem_MemWrite),
        .ResultSrc_out(mem_ResultSrc)
    );

endmodule
