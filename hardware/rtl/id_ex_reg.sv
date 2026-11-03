
module id_ex_reg (
    input  logic        clk,
    input  logic        rst_n,
    input  logic        enable,
    input  logic        flush,

    // Data inputs
    input  logic [31:0] pc_in,
    input  logic [31:0] pc_plus4_in,
    input  logic [31:0] rs1_data_in,
    input  logic [31:0] rs2_data_in,
    input  logic [31:0] imm_in,

    // Register addresses
    input  logic [4:0] rs1_in,
    input  logic [4:0] rs2_in,
    input  logic [4:0] rd_in,

    // Instruction fields
    input  logic [2:0] funct3_in,
    input  logic [6:0] opcode_in,

    // Control inputs
    input  logic       RegWrite_in,
    input  logic       ALUSrc_in,
    input  logic       MemRead_in,
    input  logic       MemWrite_in,
    input  logic [1:0] ResultSrc_in,
    input  logic       Branch_in,
    input  logic       Jump_in,
    input  logic [3:0] ALUControl_in,

    // Data outputs
    output logic [31:0] pc_out,
    output logic [31:0] pc_plus4_out,
    output logic [31:0] rs1_data_out,
    output logic [31:0] rs2_data_out,
    output logic [31:0] imm_out,

    // Register addresses
    output logic [4:0] rs1_out,
    output logic [4:0] rs2_out,
    output logic [4:0] rd_out,

    // Instruction fields
    output logic [2:0] funct3_out,
    output logic [6:0] opcode_out,

    // Control outputs
    output logic       RegWrite_out,
    output logic       ALUSrc_out,
    output logic       MemRead_out,
    output logic       MemWrite_out,
    output logic [1:0] ResultSrc_out,
    output logic       Branch_out,
    output logic       Jump_out,
    output logic [3:0] ALUControl_out
);

    always_ff @(posedge clk) begin

        if (!rst_n) begin
            pc_out          <= 32'b0;
            pc_plus4_out    <= 32'b0;
            rs1_data_out    <= 32'b0;
            rs2_data_out    <= 32'b0;
            imm_out         <= 32'b0;

            rs1_out         <= 5'b0;
            rs2_out         <= 5'b0;
            rd_out          <= 5'b0;

            funct3_out      <= 3'b0;
            opcode_out      <= 7'b0;

            RegWrite_out    <= 1'b0;
            ALUSrc_out      <= 1'b0;
            MemRead_out     <= 1'b0;
            MemWrite_out    <= 1'b0;
            ResultSrc_out   <= 2'b0;
            Branch_out      <= 1'b0;
            Jump_out        <= 1'b0;
            ALUControl_out  <= 4'b0;
        end

        else if (flush) begin
            pc_out          <= 32'b0;
            pc_plus4_out    <= 32'b0;
            rs1_data_out    <= 32'b0;
            rs2_data_out    <= 32'b0;
            imm_out         <= 32'b0;

            rs1_out         <= 5'b0;
            rs2_out         <= 5'b0;
            rd_out          <= 5'b0;

            funct3_out      <= 3'b0;
            opcode_out      <= 7'b0;

            RegWrite_out    <= 1'b0;
            ALUSrc_out      <= 1'b0;
            MemRead_out     <= 1'b0;
            MemWrite_out    <= 1'b0;
            ResultSrc_out   <= 2'b0;
            Branch_out      <= 1'b0;
            Jump_out        <= 1'b0;
            ALUControl_out  <= 4'b0;
        end

        else if (enable) begin
            pc_out          <= pc_in;
            pc_plus4_out    <= pc_plus4_in;
            rs1_data_out    <= rs1_data_in;
            rs2_data_out    <= rs2_data_in;
            imm_out         <= imm_in;

            rs1_out         <= rs1_in;
            rs2_out         <= rs2_in;
            rd_out          <= rd_in;

            funct3_out      <= funct3_in;
            opcode_out      <= opcode_in;

            RegWrite_out    <= RegWrite_in;
            ALUSrc_out      <= ALUSrc_in;
            MemRead_out     <= MemRead_in;
            MemWrite_out    <= MemWrite_in;
            ResultSrc_out   <= ResultSrc_in;
            Branch_out      <= Branch_in;
            Jump_out        <= Jump_in;
            ALUControl_out  <= ALUControl_in;
        end

    end

endmodule
