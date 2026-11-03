
module alu_src_b_mux (
    input  logic [31:0] rs2_data,
    input  logic [31:0] imm,
    input  logic        sel,
    output logic [31:0] alu_operand_b
);

    always_comb begin
        alu_operand_b = sel ? imm : rs2_data;
    end

endmodule
