
module pipeline_cpu #(
    parameter IMEM_ADDR_WIDTH = 10,
    parameter DMEM_ADDR_WIDTH = 10
)(
    input logic clk,
    input logic rst_n
);

    // =========================================================
    // 1. FETCH STAGE
    // =========================================================

    logic [31:0] fetch_pc;
    logic [31:0] fetch_pc_plus4;
    logic [31:0] fetch_instruction;

    logic [31:0] pc_next;
    logic pc_write;
    logic hazard_pc_write;

    fetch_stage #(
        .ADDR_WIDTH(IMEM_ADDR_WIDTH)
    ) fetch_unit (
        .clk(clk),
        .rst_n(rst_n),
        .pc_enable(pc_write),
        .pc_next(pc_next),
        .fetch_pc(fetch_pc),
        .fetch_pc_plus4(fetch_pc_plus4),
        .fetch_instruction(fetch_instruction)
    );

    // =========================================================
    // 2. IF/ID PIPELINE REGISTER
    // =========================================================

    logic [31:0] if_id_pc;
    logic [31:0] if_id_pc_plus4;
    logic [31:0] if_id_instruction;

    logic if_id_write;
    logic if_id_flush;

    if_id_reg if_id_register (
        .clk(clk),
        .rst_n(rst_n),
        .enable(if_id_write),
        .flush(if_id_flush),

        .pc_in(fetch_pc),
        .pc_plus4_in(fetch_pc_plus4),
        .instruction_in(fetch_instruction),

        .pc_out(if_id_pc),
        .pc_plus4_out(if_id_pc_plus4),
        .instruction_out(if_id_instruction)
    );

    // =========================================================
    // 3. DECODE STAGE
    // =========================================================

    logic [31:0] id_pc;
    logic [31:0] id_pc_plus4;

    logic [4:0] id_rs1;
    logic [4:0] id_rs2;
    logic [4:0] id_rd;

    logic [2:0] id_funct3;

    logic [31:0] id_rs1_data;
    logic [31:0] id_rs2_data;
    logic [31:0] id_imm;

    logic id_RegWrite;
    logic id_ALUSrc;
    logic id_MemRead;
    logic id_MemWrite;
    logic [1:0] id_ResultSrc;
    logic id_Branch;
    logic id_Jump;
    logic [2:0] id_ImmSrc;
    logic [3:0] id_ALUControl;

    // Writeback signals
    logic [31:0] wb_writeback_data;
    logic [4:0] wb_writeback_rd;
    logic wb_writeback_enable;

    decode_stage decode_unit (
        .clk(clk),

        .instruction(if_id_instruction),
        .pc(if_id_pc),
        .pc_plus4(if_id_pc_plus4),

        .wb_regwrite(wb_writeback_enable),
        .wb_rd(wb_writeback_rd),
        .wb_write_data(wb_writeback_data),

        .id_pc(id_pc),
        .id_pc_plus4(id_pc_plus4),

        .rs1(id_rs1),
        .rs2(id_rs2),
        .rd(id_rd),
        .funct3(id_funct3),

        .rs1_data(id_rs1_data),
        .rs2_data(id_rs2_data),
        .imm(id_imm),

        .RegWrite(id_RegWrite),
        .ALUSrc(id_ALUSrc),
        .MemRead(id_MemRead),
        .MemWrite(id_MemWrite),
        .ResultSrc(id_ResultSrc),
        .Branch(id_Branch),
        .Jump(id_Jump),
        .ImmSrc(id_ImmSrc),
        .ALUControl(id_ALUControl)
    );

    // =========================================================
    // 4. HAZARD DETECTION
    // =========================================================

    logic [4:0] hazard_rs1;
    logic [4:0] hazard_rs2;

    logic id_ex_MemRead;
    logic [4:0] id_ex_rd;

    logic control_stall;

    // Determine which source fields are actually used.
    always_comb begin

        hazard_rs1 = 5'd0;
        hazard_rs2 = 5'd0;

        case (if_id_instruction[6:0])

            // R-type
            7'b0110011: begin
                hazard_rs1 = id_rs1;
                hazard_rs2 = id_rs2;
            end

            // I-type arithmetic and logical
            // Load
            // JALR
            7'b0010011,
            7'b0000011,
            7'b1100111: begin
                hazard_rs1 = id_rs1;
            end

            // Store
            // Conditional branch
            7'b0100011,
            7'b1100011: begin
                hazard_rs1 = id_rs1;
                hazard_rs2 = id_rs2;
            end

            default: begin
                hazard_rs1 = 5'd0;
                hazard_rs2 = 5'd0;
            end

        endcase

    end

    hazard_detection_unit hazard_unit (
        .rs1_id(hazard_rs1),
        .rs2_id(hazard_rs2),

        .rd_ex(id_ex_rd),
        .memread_ex(id_ex_MemRead),

        .pc_write(hazard_pc_write),
        .if_id_write(if_id_write),
        .control_stall(control_stall)
    );

    // =========================================================
    // 5. ID/EX PIPELINE REGISTER
    // =========================================================

    logic id_ex_flush;

    logic [31:0] ex_pc;
    logic [31:0] ex_pc_plus4;
    logic [31:0] ex_rs1_data;
    logic [31:0] ex_rs2_data;
    logic [31:0] ex_imm;

    logic [4:0] ex_rs1;
    logic [4:0] ex_rs2;
    logic [4:0] ex_rd;

    logic [2:0] ex_funct3;
    logic [6:0] ex_opcode;

    logic ex_RegWrite;
    logic ex_ALUSrc;
    logic ex_MemWrite;
    logic [1:0] ex_ResultSrc;
    logic ex_Branch;
    logic ex_Jump;
    logic [3:0] ex_ALUControl;

    // ID/EX flush:
    // 1. Load-use hazard
    // 2. Taken branch or jump

    logic redirect;

    logic branch_taken;
    logic jalr;
    logic [1:0] pc_sel;

    logic [31:0] branch_target;
    logic [31:0] jal_target;
    logic [31:0] jalr_target;

    assign redirect = (pc_sel != 2'b00);

    assign id_ex_flush = control_stall || redirect;

    id_ex_reg id_ex_register (
        .clk(clk),
        .rst_n(rst_n),
        .enable(1'b1),
        .flush(id_ex_flush),

        .pc_in(id_pc),
        .pc_plus4_in(id_pc_plus4),
        .rs1_data_in(id_rs1_data),
        .rs2_data_in(id_rs2_data),
        .imm_in(id_imm),

        .rs1_in(id_rs1),
        .rs2_in(id_rs2),
        .rd_in(id_rd),

        .funct3_in(id_funct3),
        .opcode_in(if_id_instruction[6:0]),

        .RegWrite_in(control_stall ? 1'b0 : id_RegWrite),
        .ALUSrc_in(id_ALUSrc),
        .MemRead_in(control_stall ? 1'b0 : id_MemRead),
        .MemWrite_in(control_stall ? 1'b0 : id_MemWrite),
        .ResultSrc_in(id_ResultSrc),
        .Branch_in(id_Branch),
        .Jump_in(id_Jump),
        .ALUControl_in(id_ALUControl),

        .pc_out(ex_pc),
        .pc_plus4_out(ex_pc_plus4),
        .rs1_data_out(ex_rs1_data),
        .rs2_data_out(ex_rs2_data),
        .imm_out(ex_imm),

        .rs1_out(ex_rs1),
        .rs2_out(ex_rs2),
        .rd_out(ex_rd),

        .funct3_out(ex_funct3),
        .opcode_out(ex_opcode),

        .RegWrite_out(ex_RegWrite),
        .ALUSrc_out(ex_ALUSrc),
        .MemRead_out(id_ex_MemRead),
        .MemWrite_out(ex_MemWrite),
        .ResultSrc_out(ex_ResultSrc),
        .Branch_out(ex_Branch),
        .Jump_out(ex_Jump),
        .ALUControl_out(ex_ALUControl)
    );

    assign id_ex_rd = ex_rd;

    // A branch or jump redirect must override a hazard stall.
    assign pc_write = redirect ? 1'b1 : hazard_pc_write;

    // =========================================================
    // 6. EXECUTE STAGE + EX/MEM REGISTER
    // =========================================================

    logic [31:0] mem_pc_plus4;
    logic [31:0] mem_alu_result;
    logic [31:0] mem_store_data;
    logic [4:0] mem_rd;

    logic mem_RegWrite;
    logic mem_MemRead;
    logic mem_MemWrite;
    logic [1:0] mem_ResultSrc;

    logic [4:0] wb_rd;
    logic wb_RegWrite;

    execute_memory_register execute_memory_unit (

        .clk(clk),
        .rst_n(rst_n),
        .enable(1'b1),
        .flush(1'b0),

        .pc(ex_pc),
        .pc_plus4(ex_pc_plus4),
        .rs1_data(ex_rs1_data),
        .rs2_data(ex_rs2_data),
        .imm(ex_imm),

        .rs1(ex_rs1),
        .rs2(ex_rs2),
        .rd(ex_rd),

        .funct3(ex_funct3),
        .opcode(ex_opcode),

        .RegWrite(ex_RegWrite),
        .ALUSrc(ex_ALUSrc),
        .MemRead(id_ex_MemRead),
        .MemWrite(ex_MemWrite),
        .ResultSrc(ex_ResultSrc),
        .Branch(ex_Branch),
        .Jump(ex_Jump),
        .ALUControl(ex_ALUControl),

        // EX/MEM forwarding
        .rd_mem(mem_rd),
        .regwrite_mem(mem_RegWrite),
        .memread_mem(mem_MemRead),
        .alu_result_mem(mem_alu_result),

        // MEM/WB forwarding
        .rd_wb(wb_rd),
        .regwrite_wb(wb_RegWrite),
        .wb_write_data(wb_writeback_data),

        // Branch and jump
        .branch_taken(branch_taken),
        .jalr(jalr),
        .pc_sel(pc_sel),
        .branch_target(branch_target),
        .jal_target(jal_target),
        .jalr_target(jalr_target),

        // EX/MEM outputs
        .mem_pc_plus4(mem_pc_plus4),
        .mem_alu_result(mem_alu_result),
        .mem_store_data(mem_store_data),
        .mem_rd(mem_rd),

        .mem_RegWrite(mem_RegWrite),
        .mem_MemRead(mem_MemRead),
        .mem_MemWrite(mem_MemWrite),
        .mem_ResultSrc(mem_ResultSrc)
    );

    // =========================================================
    // 7. PROGRAM COUNTER SELECTION
    // =========================================================

    mux4 #(
        .WIDTH(32)
    ) pc_selection_mux (
        .in0(fetch_pc_plus4),
        .in1(branch_target),
        .in2(jal_target),
        .in3(jalr_target),

        .sel(pc_sel),
        .out(pc_next)
    );

    // =========================================================
    // 8. BRANCH / JUMP PIPELINE FLUSH
    // =========================================================

    // Flush IF/ID after a branch or jump redirect.
    assign if_id_flush = redirect;

    // =========================================================
    // 9. MEMORY STAGE + MEM/WB REGISTER
    // =========================================================

    logic [31:0] wb_alu_result;
    logic [31:0] wb_mem_read_data;
    logic [31:0] wb_pc_plus4;

    logic [1:0] wb_ResultSrc;

    memory_stage #(
        .ADDR_WIDTH(DMEM_ADDR_WIDTH)
    ) memory_unit (

        .clk(clk),
        .rst_n(rst_n),
        .enable(1'b1),
        .flush(1'b0),

        .alu_result(mem_alu_result),
        .store_data(mem_store_data),
        .pc_plus4(mem_pc_plus4),
        .rd(mem_rd),

        .RegWrite(mem_RegWrite),
        .MemRead(mem_MemRead),
        .MemWrite(mem_MemWrite),
        .ResultSrc(mem_ResultSrc),

        .wb_alu_result(wb_alu_result),
        .wb_mem_read_data(wb_mem_read_data),
        .wb_pc_plus4(wb_pc_plus4),

        .wb_rd(wb_rd),
        .wb_RegWrite(wb_RegWrite),
        .wb_ResultSrc(wb_ResultSrc)
    );

    // =========================================================
    // 10. WRITEBACK STAGE
    // =========================================================

    writeback_stage writeback_unit (

        .alu_result(wb_alu_result),
        .mem_read_data(wb_mem_read_data),
        .pc_plus4(wb_pc_plus4),

        .rd(wb_rd),
        .RegWrite(wb_RegWrite),
        .ResultSrc(wb_ResultSrc),

        .writeback_data(wb_writeback_data),
        .writeback_rd(wb_writeback_rd),
        .writeback_enable(wb_writeback_enable)
    );

endmodule
