module program_counter (
    input  logic        clk,
    input  logic        rst_n,
    input  logic        pc_enable,
    input  logic [31:0] pc_next,
    output logic [31:0] pc_current
);

    always_ff @(posedge clk) begin
        if (!rst_n)
            pc_current <= 32'b0;
        else if (pc_enable)
            pc_current <= pc_next;
    end

endmodule
