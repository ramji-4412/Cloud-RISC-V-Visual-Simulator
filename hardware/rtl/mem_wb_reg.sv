module mem_wb_reg (
    input  logic        clk,
    input  logic        rst_n,
    input  logic        flush,
    input  logic        enable,

    // Data inputs
    input  logic [31:0] alu_result_in,
    input  logic [31:0] mem_read_data_in,
    input  logic [31:0] pc_plus4_in,

    // Register address
    input  logic [4:0]  rd_in,

    // Control inputs
    input  logic        RegWrite_in,
    input  logic [1:0]  ResultSrc_in,

    // Data outputs
    output logic [31:0] alu_result_out,
    output logic [31:0] mem_read_data_out,
    output logic [31:0] pc_plus4_out,

    // Register address
    output logic [4:0]  rd_out,

    // Control outputs
    output logic        RegWrite_out,
    output logic [1:0]  ResultSrc_out
);

    always_ff @(posedge clk) begin

        // Reset has highest priority
        if (!rst_n) begin
            alu_result_out   <= 32'b0;
            mem_read_data_out <= 32'b0;
            pc_plus4_out     <= 32'b0;
            rd_out           <= 5'b0;
            RegWrite_out     <= 1'b0;
            ResultSrc_out    <= 2'b00;
        end

        // Flush clears the pipeline register
        else if (flush) begin
            alu_result_out   <= 32'b0;
            mem_read_data_out <= 32'b0;
            pc_plus4_out     <= 32'b0;
            rd_out           <= 5'b0;
            RegWrite_out     <= 1'b0;
            ResultSrc_out    <= 2'b00;
        end

        // Enable allows normal data transfer
        else if (enable) begin
            alu_result_out   <= alu_result_in;
            mem_read_data_out <= mem_read_data_in;
            pc_plus4_out     <= pc_plus4_in;
            rd_out           <= rd_in;
            RegWrite_out     <= RegWrite_in;
            ResultSrc_out    <= ResultSrc_in;
        end

        // Otherwise, hold previous values
    end

endmodule
