
module tb_execute_stage;

    // ---------------------------------------------
    // ID/EX inputs
    // ---------------------------------------------

    logic [31:0] pc, pc_plus4;
    logic [31:0] rs1_data, rs2_data, imm;

    logic [4:0] rs1, rs2, rd;
    logic [2:0] funct3;
    logic [6:0] opcode;

    logic RegWrite, ALUSrc, MemRead, MemWrite;
    logic [1:0] ResultSrc;
    logic Branch, Jump;
    logic [3:0] ALUControl;

    // ---------------------------------------------
    // EX/MEM forwarding inputs
    // ---------------------------------------------

    logic [4:0] rd_mem;
    logic regwrite_mem, memread_mem;
    logic [31:0] alu_result_mem;

    // ---------------------------------------------
    // MEM/WB forwarding inputs
    // ---------------------------------------------

    logic [4:0] rd_wb;
    logic regwrite_wb;
    logic [31:0] wb_write_data;

    // ---------------------------------------------
    // Execute outputs
    // ---------------------------------------------

    logic [31:0] alu_result;
    logic [31:0] store_data;
    logic [31:0] pc_plus4_out;
    logic [4:0] rd_out;

    logic branch_taken, jalr;
    logic [1:0] pc_sel;

    logic [31:0] branch_target;
    logic [31:0] jal_target;
    logic [31:0] jalr_target;

    logic RegWrite_out, MemRead_out, MemWrite_out;
    logic [1:0] ResultSrc_out;

    integer pass_count = 0;
    integer fail_count = 0;

    // ---------------------------------------------
    // DUT
    // ---------------------------------------------

    execute_stage dut (.*);

    // ---------------------------------------------
    // Checking tasks
    // ---------------------------------------------

    task automatic check32(
        input logic [31:0] actual,
        input logic [31:0] expected,
        input string test_name
    );
    begin
        if (actual === expected) begin
            $display("PASS: %s", test_name);
            pass_count++;
        end
        else begin
            $display("FAIL: %s", test_name);
            $display("Actual:   %h", actual);
            $display("Expected: %h", expected);
            fail_count++;
        end
    end
    endtask

    task automatic check1(
        input logic actual,
        input logic expected,
        input string test_name
    );
    begin
        if (actual === expected) begin
            $display("PASS: %s", test_name);
            pass_count++;
        end
        else begin
            $display("FAIL: %s", test_name);
            $display("Actual:   %b", actual);
            $display("Expected: %b", expected);
            fail_count++;
        end
    end
    endtask

    task automatic check2(
        input logic [1:0] actual,
        input logic [1:0] expected,
        input string test_name
    );
    begin
        if (actual === expected) begin
            $display("PASS: %s", test_name);
            pass_count++;
        end
        else begin
            $display("FAIL: %s", test_name);
            $display("Actual:   %b", actual);
            $display("Expected: %b", expected);
            fail_count++;
        end
    end
    endtask

    // ---------------------------------------------
    // Default stimulus
    // ---------------------------------------------

    task automatic set_defaults;
    begin
        pc              = 32'h00001000;
        pc_plus4        = 32'h00001004;

        rs1_data        = 32'd10;
        rs2_data        = 32'd5;
        imm             = 32'd8;

        rs1             = 5'd1;
        rs2             = 5'd2;
        rd              = 5'd3;

        funct3          = 3'b000;
        opcode          = 7'b0110011;

        RegWrite        = 1'b1;
        ALUSrc          = 1'b0;
        MemRead         = 1'b0;
        MemWrite        = 1'b0;
        ResultSrc       = 2'b00;
        Branch          = 1'b0;
        Jump            = 1'b0;
        ALUControl      = 4'b0000;

        rd_mem          = 5'd0;
        regwrite_mem    = 1'b0;
        memread_mem     = 1'b0;
        alu_result_mem  = 32'b0;

        rd_wb           = 5'd0;
        regwrite_wb     = 1'b0;
        wb_write_data   = 32'b0;
    end
    endtask

    // ---------------------------------------------
    // Main test sequence
    // ---------------------------------------------

    initial begin

        $dumpfile("execute_stage.vcd");
        $dumpvars(0, tb_execute_stage);

        set_defaults();
        #1;

        // Test 1: Basic ADD
        ALUControl = 4'b0000;
        #1;
        check32(alu_result, 32'd15, "Basic ADD");

        // Test 2: Basic SUB
        ALUControl = 4'b0001;
        #1;
        check32(alu_result, 32'd5, "Basic SUB");

        // Test 3: EX/MEM forwarding - rs1
        set_defaults();
        rd_mem = 5'd1;
        regwrite_mem = 1'b1;
        alu_result_mem = 32'd20;
        #1;
        check32(alu_result, 32'd25, "EX/MEM forwarding");

        // Test 4: MEM/WB forwarding - rs2
        set_defaults();
        rd_wb = 5'd2;
        regwrite_wb = 1'b1;
        wb_write_data = 32'd30;
        #1;
        check32(alu_result, 32'd40, "MEM/WB forwarding");

        // Test 5: EX/MEM forwarding priority
        set_defaults();
        rd_mem = 5'd1;
        regwrite_mem = 1'b1;
        alu_result_mem = 32'd40;

        rd_wb = 5'd1;
        regwrite_wb = 1'b1;
        wb_write_data = 32'd100;
        #1;
        check32(alu_result, 32'd45,
                "EX/MEM forwarding priority");

        // Test 6: Do not forward EX/MEM load address
        set_defaults();
        rd_mem = 5'd1;
        regwrite_mem = 1'b1;
        memread_mem = 1'b1;
        alu_result_mem = 32'd100;
        #1;
        check32(alu_result, 32'd15,
                "EX/MEM load forwarding protection");

        // Test 7: LUI
        set_defaults();
        opcode = 7'b0110111;
        ALUSrc = 1'b1;
        imm = 32'h12345000;
        #1;
        check32(alu_result, 32'h12345000, "LUI");

        // Test 8: AUIPC
        set_defaults();
        opcode = 7'b0010111;
        ALUSrc = 1'b1;
        imm = 32'h00000100;
        #1;
        check32(alu_result, 32'h00001100, "AUIPC");

        // Test 9: BEQ - taken
        set_defaults();
        opcode = 7'b1100011;
        Branch = 1'b1;
        funct3 = 3'b000;
        rs1_data = 32'd10;
        rs2_data = 32'd10;
        imm = 32'h00000020;
        #1;
        check1(branch_taken, 1'b1, "BEQ taken");
        check2(pc_sel, 2'b01, "BEQ PC selection");
        check32(branch_target, 32'h00001020,
                "BEQ branch target");

        // Test 10: BNE - not taken
        set_defaults();
        opcode = 7'b1100011;
        Branch = 1'b1;
        funct3 = 3'b001;
        rs1_data = 32'd10;
        rs2_data = 32'd10;
        #1;
        check1(branch_taken, 1'b0, "BNE not taken");
        check2(pc_sel, 2'b00, "BNE sequential PC");

        // Test 11: JAL
        set_defaults();
        opcode = 7'b1101111;
        Jump = 1'b1;
        imm = 32'h00000040;
        #1;
        check2(pc_sel, 2'b10, "JAL PC selection");
        check32(jal_target, 32'h00001040,
                "JAL target");

        // Test 12: JALR and address alignment
        set_defaults();
        opcode = 7'b1100111;
        Jump = 1'b1;
        rs1_data = 32'h00001002;
        imm = 32'h00000011;
        #1;
        check1(jalr, 1'b1, "JALR detection");
        check2(pc_sel, 2'b11, "JALR PC selection");
        check32(jalr_target, 32'h00001012,
                "JALR target alignment");

        // Test 13: Forwarded store data
        set_defaults();
        rd_mem = 5'd2;
        regwrite_mem = 1'b1;
        alu_result_mem = 32'hAABBCCDD;
        MemWrite = 1'b1;
        #1;
        check32(store_data, 32'hAABBCCDD,
                "Forwarded store data");

        // Test 14: Output control propagation
        set_defaults();
        RegWrite = 1'b1;
        MemRead = 1'b1;
        MemWrite = 1'b1;
        ResultSrc = 2'b01;
        #1;
        check1(RegWrite_out, 1'b1, "RegWrite propagation");
        check1(MemRead_out, 1'b1, "MemRead propagation");
        check1(MemWrite_out, 1'b1, "MemWrite propagation");
        check2(ResultSrc_out, 2'b01,
               "ResultSrc propagation");

        // Test 15: Destination and PC+4 propagation
        set_defaults();
        rd = 5'd12;
        pc_plus4 = 32'h00002004;
        #1;
        check32(pc_plus4_out, 32'h00002004,
                "PC+4 propagation");
        check32({27'b0, rd_out}, 32'd12,
                "Destination register propagation");

        // -----------------------------------------
        // Summary
        // -----------------------------------------

        $display("\n================================");
        $display("EXECUTE STAGE TEST SUMMARY");
        $display("================================");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("================================");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;

    end

endmodule
