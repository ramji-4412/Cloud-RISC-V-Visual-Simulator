
module execute_stage (

    // ID/EX register data
    input  logic [31:0] pc,
    input  logic [31:0] pc_plus4,
    input  logic [31:0] rs1_data,
    input  logic [31:0] rs2_data,
    input  logic [31:0] imm,

    // Instruction fields
    input  logic [4:0] rs1,
    input  logic [4:0] rs2,
    input  logic [4:0] rd,
    input  logic [2:0] funct3,
    input  logic [6:0] opcode,

    // ID/EX control signals
    input  logic       RegWrite,
    input  logic       ALUSrc,
    input  logic       MemRead,
    input  logic       MemWrite,
    input  logic [1:0] ResultSrc,
    input  logic       Branch,
    input  logic       Jump,
    input  logic [3:0] ALUControl,

    // EX/MEM forwarding information
    input  logic [4:0]  rd_mem,
    input  logic        regwrite_mem,
    input  logic        memread_mem,
    input  logic [31:0] alu_result_mem,

    // MEM/WB forwarding information
    input  logic [4:0]  rd_wb,
    input  logic        regwrite_wb,
    input  logic [31:0] wb_write_data,

    // Execute results
    output logic [31:0] alu_result,
    output logic [31:0] store_data,
    output logic [31:0] pc_plus4_out,
    output logic [4:0]  rd_out,

    // Branch and jump information
    output logic        branch_taken,
    output logic        jalr,
    output logic [1:0]  pc_sel,
    output logic [31:0] branch_target,
    output logic [31:0] jal_target,
    output logic [31:0] jalr_target,

    // Controls passed to EX/MEM
    output logic       RegWrite_out,
    output logic       MemRead_out,
    output logic       MemWrite_out,
    output logic [1:0] ResultSrc_out
);

    // ------------------------------------------------
    // Internal signals
    // ------------------------------------------------

    logic [1:0] forward_a;
    logic [1:0] forward_b;

    logic [31:0] forwarded_rs1;
    logic [31:0] forwarded_rs2;

    logic [31:0] alu_operand_a;
    logic [31:0] alu_operand_b;

    logic [1:0] alu_a_sel;

    logic comparator_result;
    logic alu_zero;

    logic effective_regwrite_mem;

    // ------------------------------------------------
    // 1. Forwarding Unit
    // ------------------------------------------------

    // Do not forward an EX/MEM load's ALU address.
    assign effective_regwrite_mem =
        regwrite_mem && !memread_mem;

    forwarding_unit forwarding_unit_inst (
        .rs1_ex       (rs1),
        .rs2_ex       (rs2),
        .rd_mem       (rd_mem),
        .rd_wb        (rd_wb),
        .regwrite_mem (effective_regwrite_mem),
        .regwrite_wb  (regwrite_wb),
        .forward_a    (forward_a),
        .forward_b    (forward_b)
    );

    // Forwarding MUX for source register 1
    always_comb begin
        case (forward_a)
            2'b00: forwarded_rs1 = rs1_data;
            2'b10: forwarded_rs1 = alu_result_mem;
            2'b01: forwarded_rs1 = wb_write_data;
            default: forwarded_rs1 = rs1_data;
        endcase
    end

    // Forwarding MUX for source register 2
    always_comb begin
        case (forward_b)
            2'b00: forwarded_rs2 = rs2_data;
            2'b10: forwarded_rs2 = alu_result_mem;
            2'b01: forwarded_rs2 = wb_write_data;
            default: forwarded_rs2 = rs2_data;
        endcase
    end

    // Store instructions must receive the forwarded rs2 value.
    assign store_data = forwarded_rs2;

    // ------------------------------------------------
    // 2. ALU Operand A Selection
    // ------------------------------------------------

    // LUI   : 0 + immediate
    // AUIPC : PC + immediate
    // JAL   : PC + immediate
    // Other : rs1 + operand B

    always_comb begin
        case (opcode)
            7'b0110111: alu_a_sel = 2'b10; // LUI
            7'b0010111: alu_a_sel = 2'b01; // AUIPC
            7'b1101111: alu_a_sel = 2'b01; // JAL
            default:    alu_a_sel = 2'b00;
        endcase
    end

    alu_src_a_mux alu_src_a_mux_inst (
        .rs1_data      (forwarded_rs1),
        .pc            (pc),
        .sel           (alu_a_sel),
        .alu_operand_a (alu_operand_a)
    );

    // ------------------------------------------------
    // 3. ALU Operand B Selection
    // ------------------------------------------------

    alu_src_b_mux alu_src_b_mux_inst (
        .rs2_data      (forwarded_rs2),
        .imm           (imm),
        .sel           (ALUSrc),
        .alu_operand_b (alu_operand_b)
    );

    // ------------------------------------------------
    // 4. ALU
    // ------------------------------------------------

    alu alu_inst (
        .operand_a  (alu_operand_a),
        .operand_b  (alu_operand_b),
        .alu_control(ALUControl),
        .result     (alu_result),
        .zero       (alu_zero)
    );

    // ------------------------------------------------
    // 5. Branch Comparator
    // ------------------------------------------------

    branch_comparator branch_comparator_inst (
        .rs1_data    (forwarded_rs1),
        .rs2_data    (forwarded_rs2),
        .funct3      (funct3),
        .branch_taken(comparator_result)
    );

    assign branch_taken = Branch && comparator_result;

    // ------------------------------------------------
    // 6. Branch and Jump Target Generation
    // ------------------------------------------------

    pc_target_generator pc_target_generator_inst (
        .pc            (pc),
        .rs1_data      (forwarded_rs1),
        .imm           (imm),
        .branch_target (branch_target),
        .jal_target    (jal_target),
        .jalr_target   (jalr_target)
    );

    assign jalr = (opcode == 7'b1100111);

    // ------------------------------------------------
    // 7. Next PC Selection
    // ------------------------------------------------

    pc_select_control pc_select_control_inst (
        .branch       (Branch),
        .branch_taken (branch_taken),
        .jump         (Jump),
        .jalr         (jalr),
        .pc_sel       (pc_sel)
    );

    // ------------------------------------------------
    // 8. Pass Signals to EX/MEM
    // ------------------------------------------------

    assign pc_plus4_out = pc_plus4;
    assign rd_out       = rd;

    assign RegWrite_out  = RegWrite;
    assign MemRead_out   = MemRead;
    assign MemWrite_out  = MemWrite;
    assign ResultSrc_out = ResultSrc;

endmodule
