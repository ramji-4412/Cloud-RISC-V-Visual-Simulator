
module riscv_sim_top #(
    parameter IMEM_ADDR_WIDTH = 10,
    parameter DMEM_ADDR_WIDTH = 10
)(
    // Clock and reset
    input logic clk,
    input logic rst_n,

    // IF stage
    output logic [31:0] debug_fetch_pc,
    output logic [31:0] debug_fetch_instruction,

    // IF/ID pipeline register
    output logic [31:0] debug_if_id_pc,
    output logic [31:0] debug_if_id_instruction,

    // ID stage
    output logic [31:0] debug_id_rs1_data,
    output logic [31:0] debug_id_rs2_data,
    output logic [31:0] debug_id_imm,

    // ID/EX pipeline register
    output logic [31:0] debug_ex_pc,
    output logic [4:0]  debug_ex_rd,
    output logic [6:0]  debug_ex_opcode,

    // EX/MEM pipeline register
    output logic [31:0] debug_mem_alu_result,
    output logic [31:0] debug_mem_store_data,
    output logic [4:0]  debug_mem_rd,

    // MEM/WB pipeline register
    output logic [31:0] debug_wb_writeback_data,
    output logic [4:0]  debug_wb_writeback_rd,
    output logic        debug_wb_writeback_enable,

    // Hazard and control information
    output logic        debug_control_stall,
    output logic        debug_redirect,
    output logic [1:0]  debug_pc_sel,

    // Register file debug read port
    input  logic [4:0]  debug_reg_addr,
    output logic [31:0] debug_reg_data,

    // Data memory debug read port
    input  logic [31:0] debug_dmem_addr,
    output logic [31:0] debug_dmem_data
);

    // ---------------------------------------------------------
    // Processor instance
    // ---------------------------------------------------------

    pipeline_cpu #(
        .IMEM_ADDR_WIDTH(IMEM_ADDR_WIDTH),
        .DMEM_ADDR_WIDTH(DMEM_ADDR_WIDTH)
    ) cpu (
        .clk(clk),
        .rst_n(rst_n)
    );

    // ---------------------------------------------------------
    // Fetch stage debug signals
    // ---------------------------------------------------------

    assign debug_fetch_pc =
        cpu.fetch_pc;

    assign debug_fetch_instruction =
        cpu.fetch_instruction;

    // ---------------------------------------------------------
    // IF/ID debug signals
    // ---------------------------------------------------------

    assign debug_if_id_pc =
        cpu.if_id_pc;

    assign debug_if_id_instruction =
        cpu.if_id_instruction;

    // ---------------------------------------------------------
    // ID stage debug signals
    // ---------------------------------------------------------

    assign debug_id_rs1_data =
        cpu.id_rs1_data;

    assign debug_id_rs2_data =
        cpu.id_rs2_data;

    assign debug_id_imm =
        cpu.id_imm;

    // ---------------------------------------------------------
    // EX stage debug signals
    // ---------------------------------------------------------

    assign debug_ex_pc =
        cpu.ex_pc;

    assign debug_ex_rd =
        cpu.ex_rd;

    assign debug_ex_opcode =
        cpu.ex_opcode;

    // ---------------------------------------------------------
    // MEM stage debug signals
    // ---------------------------------------------------------

    assign debug_mem_alu_result =
        cpu.mem_alu_result;

    assign debug_mem_store_data =
        cpu.mem_store_data;

    assign debug_mem_rd =
        cpu.mem_rd;

    // ---------------------------------------------------------
    // WB stage debug signals
    // ---------------------------------------------------------

    assign debug_wb_writeback_data =
        cpu.wb_writeback_data;

    assign debug_wb_writeback_rd =
        cpu.wb_writeback_rd;

    assign debug_wb_writeback_enable =
        cpu.wb_writeback_enable;

    // ---------------------------------------------------------
    // Hazard and control debug signals
    // ---------------------------------------------------------

    assign debug_control_stall =
        cpu.control_stall;

    assign debug_redirect =
        cpu.redirect;

    assign debug_pc_sel =
        cpu.pc_sel;

    // ---------------------------------------------------------
    // Register file debug read
    // ---------------------------------------------------------

    assign debug_reg_data =
        cpu.decode_unit.register_file.registers[debug_reg_addr];

    // ---------------------------------------------------------
    // Data memory debug read
    // ---------------------------------------------------------

    assign debug_dmem_data =
        cpu.memory_unit.data_mem.memory[debug_dmem_addr[DMEM_ADDR_WIDTH+1:2]];

endmodule
