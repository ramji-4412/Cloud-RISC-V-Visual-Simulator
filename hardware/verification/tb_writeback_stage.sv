
`timescale 1ns/1ps

module tb_writeback_stage;

    logic [31:0] alu_result;
    logic [31:0] mem_read_data;
    logic [31:0] pc_plus4;
    logic [4:0] rd;
    logic RegWrite;
    logic [1:0] ResultSrc;

    logic [31:0] writeback_data;
    logic [4:0] writeback_rd;
    logic writeback_enable;

    int pass_count = 0;
    int fail_count = 0;

    // DUT
    writeback_stage dut (
        .alu_result(alu_result),
        .mem_read_data(mem_read_data),
        .pc_plus4(pc_plus4),
        .rd(rd),
        .RegWrite(RegWrite),
        .ResultSrc(ResultSrc),
        .writeback_data(writeback_data),
        .writeback_rd(writeback_rd),
        .writeback_enable(writeback_enable)
    );

    // Self-checking task
    task automatic check_output(
        input logic [31:0] expected_data,
        input logic [4:0] expected_rd,
        input logic expected_enable,
        input string test_name
    );
        begin
            #1;

            if ((writeback_data === expected_data) &&
                (writeback_rd === expected_rd) &&
                (writeback_enable === expected_enable)) begin

                $display("PASS: %s", test_name);
                pass_count++;
            end
            else begin
                $display("FAIL: %s", test_name);
                $display("  Expected: data=%h rd=%0d enable=%b",
                         expected_data, expected_rd, expected_enable);
                $display("  Actual:   data=%h rd=%0d enable=%b",
                         writeback_data, writeback_rd, writeback_enable);
                fail_count++;
            end
        end
    endtask

    initial begin

        $dumpfile("writeback_stage.vcd");
        $dumpvars(0, tb_writeback_stage);

        // Initialize inputs
        alu_result   = 32'h00000000;
        mem_read_data = 32'h00000000;
        pc_plus4     = 32'h00000000;
        rd           = 5'd0;
        RegWrite     = 1'b0;
        ResultSrc    = 2'b00;

        // Test 1: Select ALU result
        alu_result    = 32'h12345678;
        mem_read_data = 32'hAAAAAAAA;
        pc_plus4      = 32'h00000004;
        rd            = 5'd5;
        RegWrite      = 1'b1;
        ResultSrc     = 2'b00;

        check_output(32'h12345678, 5'd5, 1'b1,
                     "ALU result selection");

        // Test 2: Select memory read data
        ResultSrc = 2'b01;
        check_output(32'hAAAAAAAA, 5'd5, 1'b1,
                     "Memory data selection");

        // Test 3: Select PC + 4
        ResultSrc = 2'b10;
        check_output(32'h00000004, 5'd5, 1'b1,
                     "PC + 4 selection");

        // Test 4: Invalid ResultSrc
        ResultSrc = 2'b11;
        check_output(32'h00000000, 5'd5, 1'b1,
                     "Invalid ResultSrc selection");

        // Test 5: Register write disabled
        ResultSrc = 2'b00;
        RegWrite  = 1'b0;
        check_output(32'h12345678, 5'd5, 1'b0,
                     "Register write disabled");

        // Test 6: Different destination register
        rd       = 5'd15;
        RegWrite = 1'b1;
        check_output(32'h12345678, 5'd15, 1'b1,
                     "Destination register propagation");

        // Test 7: Write to x0 (destination register zero)
        rd = 5'd0;
        check_output(32'h12345678, 5'd0, 1'b1,
                     "Destination register x0 propagation");

        // Summary
        $display("\n================================");
        $display("WRITEBACK STAGE TEST SUMMARY");
        $display("================================");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("Total : %0d", pass_count + fail_count);
        $display("================================");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;
    end

endmodule
