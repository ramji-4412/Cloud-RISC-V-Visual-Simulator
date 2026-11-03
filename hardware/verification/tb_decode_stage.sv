
module tb_decode_stage;

    logic clk;

    // IF/ID inputs
    logic [31:0] instruction;
    logic [31:0] pc, pc_plus4;

    // Write-back inputs
    logic wb_regwrite;
    logic [4:0] wb_rd;
    logic [31:0] wb_write_data;

    // Instruction information
    logic [31:0] id_pc, id_pc_plus4;
    logic [4:0] rs1, rs2, rd;
    logic [2:0] funct3;

    // Register data
    logic [31:0] rs1_data, rs2_data;

    // Immediate
    logic [31:0] imm;

    // Control signals
    logic RegWrite, ALUSrc, MemRead, MemWrite;
    logic [1:0] ResultSrc;
    logic Branch, Jump;
    logic [2:0] ImmSrc;
    logic [3:0] ALUControl;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    decode_stage dut (.*);

    // Clock generation
    always #5 clk = ~clk;

    // Initialize a register through the WB interface
    task automatic write_register(
        input logic [4:0] address,
        input logic [31:0] data
    );
        begin
            @(negedge clk);
            wb_regwrite = 1;
            wb_rd = address;
            wb_write_data = data;

            @(posedge clk);
            #1;

            wb_regwrite = 0;
        end
    endtask

    // Check register data
    task automatic check_register_data(
        input logic [31:0] expected_rs1,
        input logic [31:0] expected_rs2
    );
        begin
            #1;

            if ((rs1_data === expected_rs1) &&
                (rs2_data === expected_rs2)) begin

                $display("PASS: RS1_DATA=%h | RS2_DATA=%h",
                         rs1_data, rs2_data);
                pass_count++;
            end
            else begin
                $display("FAIL: Expected RS1=%h RS2=%h | Actual RS1=%h RS2=%h",
                         expected_rs1, expected_rs2,
                         rs1_data, rs2_data);
                fail_count++;
            end
        end
    endtask

    // Check control signals
    task automatic check_control(
        input logic exp_RegWrite,
        input logic exp_ALUSrc,
        input logic exp_MemRead,
        input logic exp_MemWrite,
        input logic [1:0] exp_ResultSrc,
        input logic exp_Branch,
        input logic exp_Jump,
        input logic [2:0] exp_ImmSrc,
        input logic [3:0] exp_ALUControl
    );
        begin
            #1;

            if ((RegWrite   === exp_RegWrite)   &&
                (ALUSrc     === exp_ALUSrc)     &&
                (MemRead    === exp_MemRead)    &&
                (MemWrite   === exp_MemWrite)   &&
                (ResultSrc  === exp_ResultSrc)  &&
                (Branch     === exp_Branch)     &&
                (Jump       === exp_Jump)       &&
                (ImmSrc     === exp_ImmSrc)     &&
                (ALUControl === exp_ALUControl)) begin

                $display("PASS: Control signals verified");
                pass_count++;
            end
            else begin
                $display("FAIL: Control signal mismatch");
                $display("RegWrite=%b ALUSrc=%b MemRead=%b MemWrite=%b",
                         RegWrite, ALUSrc, MemRead, MemWrite);
                $display("ResultSrc=%b Branch=%b Jump=%b",
                         ResultSrc, Branch, Jump);
                $display("ImmSrc=%b ALUControl=%b",
                         ImmSrc, ALUControl);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("decode_stage.vcd");
        $dumpvars(0, tb_decode_stage);

        clk = 0;

        instruction = 0;
        pc = 0;
        pc_plus4 = 0;

        wb_regwrite = 0;
        wb_rd = 0;
        wb_write_data = 0;

        $display("Starting Decode Stage Testbench");

        // Initialize registers:
        // x1 = 15
        // x2 = 7
        write_register(5'd1, 32'd15);
        write_register(5'd2, 32'd7);

        // Test 1: R-type ADD x3, x1, x2
        instruction = 32'h002081B3;
        pc = 32'h00001000;
        pc_plus4 = 32'h00001004;

        #1;

        if ((rs1 == 1) && (rs2 == 2) && (rd == 3) &&
            (funct3 == 3'b000) &&
            (id_pc == 32'h00001000) &&
            (id_pc_plus4 == 32'h00001004)) begin

            $display("PASS: R-type instruction fields and PC");
            pass_count++;
        end
        else begin
            $display("FAIL: R-type instruction fields");
            fail_count++;
        end

        // Test 2: Register file reads
        check_register_data(32'd15, 32'd7);

        // Test 3: R-type ADD control signals
        check_control(
            1'b1,       // RegWrite
            1'b0,       // ALUSrc
            1'b0,       // MemRead
            1'b0,       // MemWrite
            2'b00,      // ResultSrc
            1'b0,       // Branch
            1'b0,       // Jump
            3'b000,     // ImmSrc
            4'b0000     // ALUControl: ADD
        );

        // Test 4: I-type ADDI x4, x1, 10
        instruction = 32'h00A08213;
        #1;

        if ((rs1 == 1) && (rd == 4) &&
            (imm === 32'd10)) begin

            $display("PASS: ADDI fields and immediate");
            pass_count++;
        end
        else begin
            $display("FAIL: ADDI fields or immediate");
            fail_count++;
        end

        // Test 5: ADDI control signals
        check_control(
            1'b1,
            1'b1,
            1'b0,
            1'b0,
            2'b00,
            1'b0,
            1'b0,
            3'b000,
            4'b0000
        );

        // Test 6: WB-to-ID bypass
        // ADD x3, x1, x2
        instruction = 32'h002081B3;

        wb_regwrite = 1;
        wb_rd = 5'd1;
        wb_write_data = 32'd99;

        check_register_data(32'd99, 32'd7);

        // Disable bypass
        wb_regwrite = 0;

        // Test 7: x0 protection
        // ADD x5, x0, x2
        instruction = 32'h002002B3;

        // Attempt to write x0
        wb_regwrite = 1;
        wb_rd = 5'd0;
        wb_write_data = 32'hFFFFFFFF;

        check_register_data(32'd0, 32'd7);

        // Test 8: x0 remains zero after attempted write
        wb_regwrite = 0;
        #1;

        if (rs1_data === 32'd0) begin
            $display("PASS: x0 always returns zero");
            pass_count++;
        end
        else begin
            $display("FAIL: x0 protection");
            fail_count++;
        end

        // Summary
        $display("--------------------------------");
        $display("Total Passed: %0d", pass_count);
        $display("Total Failed: %0d", fail_count);
        $display("--------------------------------");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;
    end

endmodule
