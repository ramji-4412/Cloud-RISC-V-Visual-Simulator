
module pc_select_control (

    input  logic branch,
    input  logic branch_taken,
    input  logic jump,
    input  logic jalr,

    output logic [1:0] pc_sel

);

    always_comb begin

        // Default: sequential execution (PC + 4)
        pc_sel = 2'b00;

        // Conditional branch
        if (branch && branch_taken)
            pc_sel = 2'b01;

        // JAL
        if (jump && !jalr)
            pc_sel = 2'b10;

        // JALR
        if (jump && jalr)
            pc_sel = 2'b11;

    end

endmodule
