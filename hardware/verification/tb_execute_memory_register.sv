
module tb_execute_memory_register;

    logic clk, rst_n, enable, flush;

    logic [31:0] pc, pc_plus4;
    logic [31:0] rs1_data, rs2_data, imm;

    logic [4:0] rs1, rs2, rd;
    logic [2:0] funct3;
    logic [6:0] opcode;

    logic RegWrite, ALUSrc, MemRead, MemWrite;
    logic [1:0] ResultSrc;
    logic Branch, Jump;
    logic [3:0] ALUControl;

    logic [4:0] rd_mem;
    logic regwrite_mem, memread_mem;
    logic [31:0] alu_result_mem;

    logic [4:0] rd_wb;
    logic regwrite_wb;
    logic [31:0] wb_write_data;

    logic branch_taken, jalr;
    logic [1:0] pc_sel;
    logic [31:0] branch_target, jal_target, jalr_target;

    logic [31:0] mem_pc_plus4;
    logic [31:0] mem_alu_result;
    logic [31:0] mem_store_data;
    logic [4:0] mem_rd;

    logic mem_RegWrite, mem_MemRead, mem_MemWrite;
    logic [1:0] mem_ResultSrc;

    integer pass_count = 0;
    integer fail_count = 0;

    execute_memory_register dut (.*);

    // Clock
    initial clk = 0;
    always #5 clk = ~clk;

    // Check 32-bit outputs
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

    // Check 5-bit outputs
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

    // Check 1-bit outputs
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

    // Check 2-bit outputs
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

    task automatic set_defaults;
    begin
        rst_n = 1;
        enable = 1;
        flush = 0;

        pc = 32'h00001000;
        pc_plus4 = 32'h00001004;

        rs1_data = 32'd10;
        rs2_data = 32'd5;
        imm = 32'd8;

        rs1 = 5'd1;
        rs2 = 5'd2;
        rd = 5'd3;

        funct3 = 3'b000;
        opcode = 7'b0110011;

        RegWrite = 1;
        ALUSrc = 0;
        MemRead = 0;
        MemWrite = 0;
        ResultSrc = 2'b00;
        Branch = 0;
        Jump = 0;
        ALUControl = 4'b0000;

        rd_mem = 0;
        regwrite_mem = 0;
        memread_mem = 0;
        alu_result_mem = 0;

        rd_wb = 0;
        regwrite_wb = 0;
        wb_write_data = 0;
    end
    endtask

    initial begin

        $dumpfile("execute_memory_register.vcd");
        $dumpvars(0, tb_execute_memory_register);

        set_defaults();

        // Test 1: Synchronous reset
        rst_n = 0;
        @(posedge clk);
        #1;

        check32(mem_alu_result, 0, "Reset ALU result");
        check32(mem_store_data, 0, "Reset store data");
        check32(mem_pc_plus4, 0, "Reset PC+4");
        check5(mem_rd, 0, "Reset destination register");
        check1(mem_RegWrite, 0, "Reset RegWrite");
        check1(mem_MemRead, 0, "Reset MemRead");
        check1(mem_MemWrite, 0, "Reset MemWrite");
        check2(mem_ResultSrc, 0, "Reset ResultSrc");

        // Test 2: Normal data/control transfer
        rst_n = 1;
        enable = 1;
        rs1_data = 32'd20;
        rs2_data = 32'd7;
        pc_plus4 = 32'h00002004;
        rd = 5'd10;
        ALUControl = 4'b0000;

        @(posedge clk);
        #1;

        check32(mem_alu_result, 32'd27,
                "Normal ALU result transfer");
        check32(mem_store_data, 32'd7,
                "Normal store data transfer");
        check32(mem_pc_plus4, 32'h00002004,
                "Normal PC+4 transfer");
        check5(mem_rd, 5'd10,
               "Normal destination transfer");
        check1(mem_RegWrite, 1,
               "Normal RegWrite transfer");

        // Test 3: Enable low - hold previous values
        @(negedge clk);
        enable = 0;
        rs1_data = 32'd100;
        rs2_data = 32'd200;
        pc_plus4 = 32'h00003004;
        rd = 5'd15;

        @(posedge clk);
        #1;

        check32(mem_alu_result, 32'd27,
                "Enable low holds ALU result");
        check32(mem_store_data, 32'd7,
                "Enable low holds store data");
        check32(mem_pc_plus4, 32'h00002004,
                "Enable low holds PC+4");
        check5(mem_rd, 5'd10,
               "Enable low holds destination");

        // Test 4: Flush clears registered values
        @(negedge clk);
        enable = 1;
        flush = 1;

        @(posedge clk);
        #1;

        check32(mem_alu_result, 0, "Flush ALU result");
        check32(mem_store_data, 0, "Flush store data");
        check32(mem_pc_plus4, 0, "Flush PC+4");
        check5(mem_rd, 0, "Flush destination");
        check1(mem_RegWrite, 0, "Flush RegWrite");
        check1(mem_MemRead, 0, "Flush MemRead");
        check1(mem_MemWrite, 0, "Flush MemWrite");
        check2(mem_ResultSrc, 0, "Flush ResultSrc");

        // Test 5: Flush priority over enable
        @(negedge clk);
        flush = 1;
        enable = 1;
        rs1_data = 32'd50;
        rs2_data = 32'd60;

        @(posedge clk);
        #1;

        check32(mem_alu_result, 0,
                "Flush priority over enable");

        // Test 6: Reset priority
        @(negedge clk);
        rst_n = 0;
        flush = 0;
        enable = 1;

        @(posedge clk);
        #1;

        check32(mem_alu_result, 0,
                "Reset priority");

        // Summary
        $display("\n====================================");
        $display("EXECUTE-MEMORY REGISTER TEST SUMMARY");
        $display("====================================");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("====================================");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;
    end

endmodule
