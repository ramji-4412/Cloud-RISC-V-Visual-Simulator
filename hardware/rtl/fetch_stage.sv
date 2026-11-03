
module fetch_stage #(
    parameter ADDR_WIDTH = 10
)(
    input  logic        clk,
    input  logic        rst_n,
    input  logic        pc_enable,
    input  logic [31:0] pc_next,

    output logic [31:0] fetch_pc,
    output logic [31:0] fetch_pc_plus4,
    output logic [31:0] fetch_instruction
);

    // Program Counter
    program_counter pc_reg (
        .clk       (clk),
        .rst_n     (rst_n),
        .pc_enable (pc_enable),
        .pc_next   (pc_next),
        .pc_current(fetch_pc)
    );

    // PC + 4 Adder
    pc_adder pc_incrementer (
        .pc_current(fetch_pc),
        .pc_plus4  (fetch_pc_plus4)
    );

    // Instruction Memory
    instruction_memory #(
        .ADDR_WIDTH(ADDR_WIDTH)
    ) instruction_mem (
        .pc         (fetch_pc),
        .instruction(fetch_instruction)
    );

endmodule
