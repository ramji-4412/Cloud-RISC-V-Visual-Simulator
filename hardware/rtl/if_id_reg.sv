module if_id_reg (
    input  logic        clk,
    input  logic        rst_n,
    input  logic        enable,
    input  logic        flush,

    input  logic [31:0] pc_in,
    input  logic [31:0] pc_plus4_in,
    input  logic [31:0] instruction_in,

    output logic [31:0] pc_out,
    output logic [31:0] pc_plus4_out,
    output logic [31:0] instruction_out
);

    always_ff @(posedge clk) begin
        if (!rst_n) begin
            pc_out          <= 32'b0;
            pc_plus4_out    <= 32'b0;
            instruction_out <= 32'h00000013; // NOP (ADDI x0,x0,0)
        end
        else if (flush) begin
            pc_out          <= 32'b0;
            pc_plus4_out    <= 32'b0;
            instruction_out <= 32'h00000013;
        end
        else if (enable) begin
            pc_out          <= pc_in;
            pc_plus4_out    <= pc_plus4_in;
            instruction_out <= instruction_in;
        end
    end

endmodule
