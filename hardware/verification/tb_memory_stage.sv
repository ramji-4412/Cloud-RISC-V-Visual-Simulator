
module tb_memory_stage;

    logic clk, rst_n, enable, flush;

    // EX/MEM inputs
    logic [31:0] alu_result;
    logic [31:0] store_data;
    logic [31:0] pc_plus4;
    logic [4:0] rd;

    logic RegWrite, MemRead, MemWrite;
    logic [1:0] ResultSrc;

    // MEM/WB outputs
    logic [31:0] wb_alu_result;
    logic [31:0] wb_mem_read_data;
    logic [31:0] wb_pc_plus4;

    logic [4:0] wb_rd;

    logic wb_RegWrite;
    logic [1:0] wb_ResultSrc;

    integer pass_count = 0;
    integer fail_count = 0;

    // DUT: 16 words of memory
    memory_stage #(
        .ADDR_WIDTH(4)
    ) dut (.*);

    // Clock generation
    initial clk = 0;
    always #5 clk = ~clk;

    // -----------------------------------------
    // Checking tasks
    // -----------------------------------------

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
            $display("Actual: %h Expected: %h",
                     actual, expected);
            fail_count++;
        end
    end
    endtask

    task automatic check5(
        input logic [4:0] actual,
        input logic [4:0] expected,
        input string test_name
    );
    begin
        if (actual === expected) begin
            $display("PASS: %s", test_name);
            pass_count++;
        end
        else begin
            $display("FAIL: %s", test_name);
            $display("Actual: %h Expected: %h",
                     actual, expected);
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
            $display("Actual: %b Expected: %b",
                     actual, expected);
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
            $display("Actual: %b Expected: %b",
                     actual, expected);
            fail_count++;
        end
    end
    endtask

    // -----------------------------------------
    // Default stimulus
    // -----------------------------------------

    task automatic set_defaults;
    begin
        rst_n = 1;
        enable = 1;
        flush = 0;

        alu_result = 32'h00000020;
        store_data = 32'h12345678;
        pc_plus4 = 32'h00001004;
        rd = 5'd5;

        RegWrite = 1;
        MemRead = 0;
        MemWrite = 0;
        ResultSrc = 2'b00;
    end
    endtask

    // -----------------------------------------
    // Main test sequence
    // -----------------------------------------

    initial begin

        $dumpfile("memory_stage.vcd");
        $dumpvars(0, tb_memory_stage);

        set_defaults();

        // Test 1: Reset
        rst_n = 0;

        @(posedge clk);
        #1;

        check32(wb_alu_result, 0, "Reset ALU result");
        check32(wb_mem_read_data, 0, "Reset memory data");
        check32(wb_pc_plus4, 0, "Reset PC+4");
        check5(wb_rd, 0, "Reset destination");
        check1(wb_RegWrite, 0, "Reset RegWrite");
        check2(wb_ResultSrc, 0, "Reset ResultSrc");

        // Test 2: Normal ALU result transfer
        @(negedge clk);
        rst_n = 1;
        alu_result = 32'h000000AA;
        pc_plus4 = 32'h00002004;
        rd = 5'd10;
        ResultSrc = 2'b00;

        @(posedge clk);
        #1;

        check32(wb_alu_result, 32'h000000AA,
                "ALU result transfer");
        check32(wb_pc_plus4, 32'h00002004,
                "PC+4 transfer");
        check5(wb_rd, 5'd10,
               "Destination transfer");
        check1(wb_RegWrite, 1,
               "RegWrite transfer");
        check2(wb_ResultSrc, 2'b00,
               "ALU ResultSrc transfer");

        // Test 3: Store operation
        // Address 0x20 = word index 8
        @(negedge clk);
        MemWrite = 1;
        MemRead = 0;
        alu_result = 32'h00000020;
        store_data = 32'hDEADBEEF;

        @(posedge clk);
        #1;

        check32(dut.data_mem.memory[8],
                32'hDEADBEEF,
                "Synchronous memory write");

        // Test 4: Load operation
        @(negedge clk);
        MemWrite = 0;
        MemRead = 1;
        alu_result = 32'h00000020;
        rd = 5'd7;
        ResultSrc = 2'b01;

        #1;
        check32(dut.mem_read_data, 32'hDEADBEEF,
                "Combinational memory read");

        @(posedge clk);
        #1;

        check32(wb_mem_read_data, 32'hDEADBEEF,
                "Load data captured in MEM/WB");
        check32(wb_alu_result, 32'h00000020,
                "Load ALU address transfer");
        check5(wb_rd, 5'd7,
               "Load destination transfer");
        check2(wb_ResultSrc, 2'b01,
               "Load ResultSrc transfer");

        // Test 5: Memory read disabled
        @(negedge clk);
        MemRead = 0;
        enable = 0;

        #1;
        check32(dut.mem_read_data, 32'b0,
            "Read disabled");

        // Test 6: Enable low - hold pipeline outputs
        @(negedge clk);
        enable = 0;
        alu_result = 32'h000000BB;
        pc_plus4 = 32'h00003004;
        rd = 5'd15;

        @(posedge clk);
        #1;

        check32(wb_alu_result, 32'h00000020,
                "Enable low holds ALU result");
        check32(wb_mem_read_data, 32'hDEADBEEF,
                "Enable low holds memory data");
        check32(wb_pc_plus4, 32'h00002004,
                "Enable low holds PC+4");
        check5(wb_rd, 5'd7,
               "Enable low holds destination");

        // Test 7: Flush
        @(negedge clk);
        enable = 1;
        flush = 1;

        @(posedge clk);
        #1;

        check32(wb_alu_result, 0, "Flush ALU result");
        check32(wb_mem_read_data, 0, "Flush memory data");
        check32(wb_pc_plus4, 0, "Flush PC+4");
        check5(wb_rd, 0, "Flush destination");
        check1(wb_RegWrite, 0, "Flush RegWrite");
        check2(wb_ResultSrc, 0, "Flush ResultSrc");

        // Test 8: Flush priority over enable
        @(negedge clk);
        flush = 1;
        enable = 1;
        alu_result = 32'h000000CC;

        @(posedge clk);
        #1;

        check32(wb_alu_result, 0,
                "Flush priority over enable");

        // Test 9: Reset priority
        @(negedge clk);
        rst_n = 0;
        flush = 0;
        enable = 1;

        @(posedge clk);
        #1;

        check32(wb_alu_result, 0,
                "Reset priority");

        // Test 10: Unaligned memory access
        @(negedge clk);
        rst_n = 1;
        MemRead = 1;
        alu_result = 32'h00000021;

        #1;
        check32(dut.mem_read_data, 0,
                "Unaligned read returns zero");

        // -----------------------------------------
        // Summary
        // -----------------------------------------

        $display("\n================================");
        $display("MEMORY STAGE TEST SUMMARY");
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
