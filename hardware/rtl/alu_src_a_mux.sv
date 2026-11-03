
module alu_src_a_mux (
    input  logic [31:0] rs1_data,
    input  logic [31:0] pc,
    input  logic [1:0]  sel,
    output logic [31:0] alu_operand_a
);

    always_comb begin
        case (sel)
            2'b00: alu_operand_a = rs1_data;
            2'b01: alu_operand_a = pc;
            2'b10: alu_operand_a = 32'b0;
            default: alu_operand_a = 32'b0;
        endcase
    end

endmodule
