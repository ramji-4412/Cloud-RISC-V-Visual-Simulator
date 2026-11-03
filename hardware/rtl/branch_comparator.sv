module branch_comparator (

    input  logic [31:0] rs1_data,
    input  logic [31:0] rs2_data,
    input  logic [2:0]  funct3,

    output logic        branch_taken

);

    always_comb begin

        // Default: Branch not taken
        branch_taken = 1'b0;

        case (funct3)

            // Branch if Equal
            3'b000:
                branch_taken = (rs1_data == rs2_data);

            // Branch if Not Equal
            3'b001:
                branch_taken = (rs1_data != rs2_data);

            // Branch if Less Than (Signed)
            3'b100:
                branch_taken = ($signed(rs1_data) < $signed(rs2_data));

            // Branch if Greater Than or Equal (Signed)
            3'b101:
                branch_taken = ($signed(rs1_data) >= $signed(rs2_data));

            // Branch if Less Than (Unsigned)
            3'b110:
                branch_taken = (rs1_data < rs2_data);

            // Branch if Greater Than or Equal (Unsigned)
            3'b111:
                branch_taken = (rs1_data >= rs2_data);

            // Unsupported funct3
            default:
                branch_taken = 1'b0;

        endcase

    end

endmodule
