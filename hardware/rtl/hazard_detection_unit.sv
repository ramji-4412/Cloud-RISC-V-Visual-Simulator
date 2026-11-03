module hazard_detection_unit (

    // Source registers of instruction in ID stage
    input logic [4:0] rs1_id,
    input logic [4:0] rs2_id,

    // Destination register of instruction in EX stage
    input logic [4:0] rd_ex,

    // Indicates whether EX instruction is a load
    input logic memread_ex,

    // Pipeline control outputs
    output logic pc_write,
    output logic if_id_write,
    output logic control_stall

);

    always_comb begin

        // Default: Normal pipeline operation
        pc_write      = 1'b1;
        if_id_write   = 1'b1;
        control_stall = 1'b0;

        // Detect load-use hazard
        if (memread_ex &&
            (rd_ex != 5'd0) &&
            ((rd_ex == rs1_id) || (rd_ex == rs2_id))) begin

            pc_write      = 1'b0;
            if_id_write   = 1'b0;
            control_stall = 1'b1;

        end

    end

endmodule
