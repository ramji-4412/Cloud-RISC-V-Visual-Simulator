
module ex_mem_reg (
    input  logic        clk,
    input  logic        rst_n,
    input  logic        enable,
    input  logic        flush,

    // Data inputs
    input  logic [31:0] pc_plus4_in,
    input  logic [31:0] alu_result_in,
    input  logic [31:0] rs2_data_in,

    // Destination register
    input  logic [4:0] rd_in,

    // Control inputs
    input  logic       RegWrite_in,
    input  logic       MemRead_in,
    input  logic       MemWrite_in,
    input  logic [1:0] ResultSrc_in,

    // Data outputs
    output logic [31:0] pc_plus4_out,
    output logic [31:0] alu_result_out,
    output logic [31:0] rs2_data_out,

    // Destination register
    output logic [4:0] rd_out,

    // Control outputs
    output logic       RegWrite_out,
    output logic       MemRead_out,
    output logic       MemWrite_out,
    output logic [1:0] ResultSrc_out
);

    always_ff @(posedge clk) begin

        if (!rst_n) begin
            pc_plus4_out   <= 32'b0;
            alu_result_out <= 32'b0;
            rs2_data_out   <= 32'b0;
            rd_out         <= 5'b0;

            RegWrite_out   <= 1'b0;
            MemRead_out    <= 1'b0;
            MemWrite_out   <= 1'b0;
            ResultSrc_out  <= 2'b0;
        end

        else if (flush) begin
            pc_plus4_out   <= 32'b0;
            alu_result_out <= 32'b0;
            rs2_data_out   <= 32'b0;
            rd_out         <= 5'b0;

            RegWrite_out   <= 1'b0;
            MemRead_out    <= 1'b0;
            MemWrite_out   <= 1'b0;
            ResultSrc_out  <= 2'b0;
        end

        else if (enable) begin
            pc_plus4_out   <= pc_plus4_in;
            alu_result_out <= alu_result_in;
            rs2_data_out   <= rs2_data_in;
            rd_out         <= rd_in;

            RegWrite_out   <= RegWrite_in;
            MemRead_out    <= MemRead_in;
            MemWrite_out   <= MemWrite_in;
            ResultSrc_out  <= ResultSrc_in;
        end

    end

endmodule
