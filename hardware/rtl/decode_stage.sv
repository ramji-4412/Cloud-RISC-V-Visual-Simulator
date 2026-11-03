
module decode_stage (

    input logic clk,

    // Inputs from IF/ID pipeline register
    input logic [31:0] instruction,
    input logic [31:0] pc,
    input logic [31:0] pc_plus4,

    // Write-back interface
    input logic        wb_regwrite,
    input logic [4:0]  wb_rd,
    input logic [31:0] wb_write_data,

    // Instruction information
    output logic [31:0] id_pc,
    output logic [31:0] id_pc_plus4,
    output logic [4:0]  rs1,
    output logic [4:0]  rs2,
    output logic [4:0]  rd,
    output logic [2:0]  funct3,

    // Register file data
    output logic [31:0] rs1_data,
    output logic [31:0] rs2_data,

    // Immediate
    output logic [31:0] imm,

    // Control signals
    output logic       RegWrite,
    output logic       ALUSrc,
    output logic       MemRead,
    output logic       MemWrite,
    output logic [1:0] ResultSrc,
    output logic       Branch,
    output logic       Jump,
    output logic [2:0] ImmSrc,
    output logic [3:0] ALUControl

);

    // Internal register file outputs
    logic [31:0] reg_read_data1;
    logic [31:0] reg_read_data2;

    // Instruction fields
    assign rs1 = instruction[19:15];
    assign rs2 = instruction[24:20];
    assign rd  = instruction[11:7];

    assign funct3 = instruction[14:12];

    // Pass PC information to the next pipeline stage
    assign id_pc      = pc;
    assign id_pc_plus4 = pc_plus4;

    // Register File
    regfile register_file (
        .clk        (clk),

        .we         (wb_regwrite),
        .rd         (wb_rd),
        .write_data (wb_write_data),

        .rs1        (rs1),
        .rs2        (rs2),

        .read_data1 (reg_read_data1),
        .read_data2 (reg_read_data2)
    );

    // WB-to-ID bypass
    // Handles a WB write and ID read of the same register
    // during the same clock cycle.
    always_comb begin

        rs1_data = reg_read_data1;
        rs2_data = reg_read_data2;

        if (wb_regwrite && (wb_rd != 5'd0) && (wb_rd == rs1))
            rs1_data = wb_write_data;

        if (wb_regwrite && (wb_rd != 5'd0) && (wb_rd == rs2))
            rs2_data = wb_write_data;

    end

    // Immediate Generator
    imm_gen immediate_generator (
        .instruction (instruction),
        .imm_src     (ImmSrc),
        .imm_out     (imm)
    );

    // Control Unit
    control_unit controller (
        .opcode     (instruction[6:0]),
        .funct3     (instruction[14:12]),
        .funct7     (instruction[31:25]),

        .RegWrite   (RegWrite),
        .ALUSrc     (ALUSrc),
        .MemRead    (MemRead),
        .MemWrite   (MemWrite),
        .ResultSrc  (ResultSrc),
        .Branch     (Branch),
        .Jump       (Jump),
        .ImmSrc     (ImmSrc),
        .ALUControl (ALUControl)
    );

endmodule
