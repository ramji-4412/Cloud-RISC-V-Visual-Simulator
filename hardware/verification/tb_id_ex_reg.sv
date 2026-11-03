module tb_id_ex_reg;

    logic clk, rst_n, enable, flush;

    logic [31:0] pc_in, pc_plus4_in;
    logic [31:0] rs1_data_in, rs2_data_in, imm_in;
    logic [4:0] rs1_in, rs2_in, rd_in;
    logic [2:0] funct3_in;

    logic RegWrite_in, ALUSrc_in, MemRead_in, MemWrite_in;
    logic [1:0] ResultSrc_in;
    logic Branch_in, Jump_in;
    logic [3:0] ALUControl_in;

    logic [31:0] pc_out, pc_plus4_out;
    logic [31:0] rs1_data_out, rs2_data_out, imm_out;
    logic [4:0] rs1_out, rs2_out, rd_out;
    logic [2:0] funct3_out;

    logic RegWrite_out, ALUSrc_out, MemRead_out, MemWrite_out;
    logic [1:0] ResultSrc_out;
    logic Branch_out, Jump_out;
    logic [3:0] ALUControl_out;
    logic [6:0] opcode_in;
    logic [6:0] opcode_out;

    logic [196:0] actual;

    integer pass_count = 0;
    integer fail_count = 0;

    id_ex_reg dut (.*);

    always #5 clk = ~clk;

    // Collect all outputs into one vector for checking.
    always_comb begin
        actual = {
            pc_out, pc_plus4_out,
            rs1_data_out, rs2_data_out, imm_out,
            rs1_out, rs2_out, rd_out,
            funct3_out, opcode_out,
            RegWrite_out, ALUSrc_out,
            MemRead_out, MemWrite_out,
            ResultSrc_out, Branch_out, Jump_out,
            ALUControl_out
        };
    end

    task automatic check_output(
        input logic [196:0] expected,
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
        pc_in          = 32'h00001000;
        pc_plus4_in    = 32'h00001004;
        rs1_data_in    = 32'h11111111;
        rs2_data_in    = 32'h22222222;
        imm_in         = 32'h00000008;

        rs1_in         = 5'd1;
        rs2_in         = 5'd2;
        rd_in          = 5'd5;
        opcode_in = 7'b0;

        funct3_in      = 3'b000;

        RegWrite_in    = 1'b1;
        ALUSrc_in      = 1'b1;
        MemRead_in     = 1'b0;
        MemWrite_in    = 1'b0;
        ResultSrc_in   = 2'b00;
        Branch_in      = 1'b0;
        Jump_in        = 1'b0;
        ALUControl_in  = 4'b0000;
    end
    endtask


initial begin
    clk = 0;
    rst_n = 0;
    enable = 0;
    flush = 0;

    drive_sample();

    $dumpfile("id_ex_reg.vcd");
    $dumpvars(0, tb_id_ex_reg);

    // Test 1: Reset
    @(posedge clk);
    check_output(197'b0, "Reset");

    // Test 2: Normal transfer including opcode
    @(negedge clk);
    rst_n = 1;
    enable = 1;
    opcode_in = 7'b0110011;

    @(posedge clk);
    check_output({
        32'h00001000, 32'h00001004,
        32'h11111111, 32'h22222222, 32'h00000008,
        5'd1, 5'd2, 5'd5,
        3'b000, 7'b0110011,
        1'b1, 1'b1, 1'b0, 1'b0,
        2'b00, 1'b0, 1'b0, 4'b0000
    }, "Normal transfer including opcode");

    // Test 3: Hold when enable is low
    @(negedge clk);
    enable = 0;
    pc_in = 32'h00002000;
    rs1_data_in = 32'hAAAAAAAA;

    @(posedge clk);
    check_output({
        32'h00001000, 32'h00001004,
        32'h11111111, 32'h22222222, 32'h00000008,
        5'd1, 5'd2, 5'd5,
        3'b000, 7'b0110011,
        1'b1, 1'b1, 1'b0, 1'b0,
        2'b00, 1'b0, 1'b0, 4'b0000
    }, "Hold previous values");

    // Test 4: Flush
    @(negedge clk);
    enable = 1;
    flush = 1;

    @(posedge clk);
    check_output(197'b0, "Flush clears data and controls");

    // Test 5: Reset priority
    @(negedge clk);
    rst_n = 0;
    flush = 0;
    enable = 1;

    @(posedge clk);
    check_output(197'b0, "Reset priority");

    // Summary
    $display("\n-------------------------------");
    $display("ID/EX REGISTER TEST SUMMARY");
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
