
module pc_target_generator (

    input  logic [31:0] pc,
    input  logic [31:0] rs1_data,
    input  logic [31:0] imm,

    output logic [31:0] branch_target,
    output logic [31:0] jal_target,
    output logic [31:0] jalr_target

);

    // Branch and JAL use PC-relative addressing
    assign branch_target = pc + imm;
    assign jal_target    = pc + imm;

    // JALR uses register-relative addressing.
    // Clear bit 0 as required by the RISC-V specification.
    assign jalr_target = (rs1_data + imm) & 32'hFFFFFFFE;

endmodule
