module forwarding_unit (
    // Source registers in EX stage
    input  logic [4:0] rs1_ex,
    input  logic [4:0] rs2_ex,

    // Destination registers in MEM and WB stages
    input  logic [4:0] rd_mem,
    input  logic [4:0] rd_wb,

    // Register write controls
    input  logic regwrite_mem,
    input  logic regwrite_wb,

    // Forwarding selections
    output logic [1:0] forward_a,
    output logic [1:0] forward_b
);

    always_comb begin

        // Default: Use register-file values
        forward_a = 2'b00;
        forward_b = 2'b00;

        // Forwarding for operand A (rs1)
        if (regwrite_mem &&
            (rd_mem != 5'd0) &&
            (rd_mem == rs1_ex)) begin

            forward_a = 2'b10;
        end

        else if (regwrite_wb &&
                 (rd_wb != 5'd0) &&
                 (rd_wb == rs1_ex)) begin

            forward_a = 2'b01;
        end

        // Forwarding for operand B (rs2)
        if (regwrite_mem &&
            (rd_mem != 5'd0) &&
            (rd_mem == rs2_ex)) begin

            forward_b = 2'b10;
        end

        else if (regwrite_wb &&
                 (rd_wb != 5'd0) &&
                 (rd_wb == rs2_ex)) begin

            forward_b = 2'b01;
        end

    end

endmodule
