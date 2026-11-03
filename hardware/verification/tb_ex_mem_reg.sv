module tb_ex_mem_reg;

    logic clk, rst_n, enable, flush;

    logic [31:0] pc_plus4_in;
    logic [31:0] alu_result_in;
    logic [31:0] rs2_data_in;
    logic [4:0] rd_in;

    logic RegWrite_in, MemRead_in, MemWrite_in;
    logic [1:0] ResultSrc_in;

    logic [31:0] pc_plus4_out;
    logic [31:0] alu_result_out;
    logic [31:0] rs2_data_out;
    logic [4:0] rd_out;

    logic RegWrite_out, MemRead_out, MemWrite_out;
    logic [1:0] ResultSrc_out;

    logic [105:0] actual;

    integer pass_count = 0;
    integer fail_count = 0;

    ex_mem_reg dut (.*);

    always #5 clk = ~clk;

    always_comb begin
        actual = {
            pc_plus4_out,
            alu_result_out,
            rs2_data_out,
            rd_out,
            RegWrite_out,
            MemRead_out,
            MemWrite_out,
            ResultSrc_out
        };
    end

    task automatic check_output(
        input logic [105:0] expected,
        input string test_name
    );
    begin
        #1;
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

    task automatic drive_sample;
    begin
        pc_plus4_in  = 32'h00001004;
        alu_result_in = 32'h00000030;
        rs2_data_in  = 32'h12345678;
        rd_in        = 5'd5;

        RegWrite_in  = 1'b1;
        MemRead_in   = 1'b0;
        MemWrite_in  = 1'b0;
        ResultSrc_in = 2'b00;
    end
    endtask

    initial begin

        clk = 0;
        rst_n = 0;
        enable = 0;
        flush = 0;

        drive_sample();

        $dumpfile("ex_mem_reg.vcd");
        $dumpvars(0, tb_ex_mem_reg);

        // Test 1: Reset
        @(posedge clk);
        check_output(106'b0, "Reset");

        // Test 2: Normal transfer
        @(negedge clk);
        rst_n = 1;
        enable = 1;

        @(posedge clk);
        check_output({
            32'h00001004,
            32'h00000030,
            32'h12345678,
            5'd5,
            1'b1, 1'b0, 1'b0,
            2'b00
        }, "Normal transfer");

        // Test 3: Hold during stall
        @(negedge clk);
        enable = 0;
        pc_plus4_in = 32'h00002004;
        alu_result_in = 32'h00000050;
        rs2_data_in = 32'hAAAAAAAA;

        @(posedge clk);
        check_output({
            32'h00001004,
            32'h00000030,
            32'h12345678,
            5'd5,
            1'b1, 1'b0, 1'b0,
            2'b00
        }, "Hold previous values");

        // Test 4: Flush
        @(negedge clk);
        enable = 1;
        flush = 1;

        @(posedge clk);
        check_output(106'b0, "Flush clears data and controls");

        // Test 5: Memory write control transfer
        @(negedge clk);
        flush = 0;

        pc_plus4_in = 32'h00001004;  // Add this line
        rs2_data_in = 32'hDEADBEEF;
        alu_result_in = 32'h00000100;
        rd_in = 5'd0;
        RegWrite_in = 0;
        MemRead_in = 0;
        MemWrite_in = 1;
        ResultSrc_in = 2'b00;

        @(posedge clk);
        check_output({
            32'h00001004,
            32'h00000100,
            32'hDEADBEEF,
            5'd0,
            1'b0, 1'b0, 1'b1,
            2'b00
        }, "Store control transfer");

        // Test 6: Load control transfer
        @(negedge clk);
        pc_plus4_in = 32'h00003004;
        alu_result_in = 32'h00000200;
        rd_in = 5'd8;
        RegWrite_in = 1;
        MemRead_in = 1;
        MemWrite_in = 0;
        ResultSrc_in = 2'b01;

        @(posedge clk);
        check_output({
            32'h00003004,
            32'h00000200,
            32'hDEADBEEF,
            5'd8,
            1'b1, 1'b1, 1'b0,
            2'b01
        }, "Load control transfer");

        // Test 7: Reset priority
        @(negedge clk);
        rst_n = 0;
        flush = 1;
        enable = 1;

        @(posedge clk);
        check_output(106'b0, "Reset priority");

        // Summary
        $display("\n-------------------------------");
        $display("EX/MEM REGISTER TEST SUMMARY");
        $display("-------------------------------");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("-------------------------------");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;
    end

endmodule
