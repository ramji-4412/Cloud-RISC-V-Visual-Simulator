
module tb_alu;

    logic [31:0] operand_a;
    logic [31:0] operand_b;
    logic [3:0]  alu_control;

    logic [31:0] result;
    logic        zero;

    int pass_count = 0;
    int fail_count = 0;

    // ALU operation encodings
    localparam logic [3:0] ALU_ADD  = 4'b0000;
    localparam logic [3:0] ALU_SUB  = 4'b0001;
    localparam logic [3:0] ALU_AND  = 4'b0010;
    localparam logic [3:0] ALU_OR   = 4'b0011;
    localparam logic [3:0] ALU_XOR  = 4'b0100;
    localparam logic [3:0] ALU_SLL  = 4'b0101;
    localparam logic [3:0] ALU_SRL  = 4'b0110;
    localparam logic [3:0] ALU_SRA  = 4'b0111;
    localparam logic [3:0] ALU_SLT  = 4'b1000;
    localparam logic [3:0] ALU_SLTU = 4'b1001;

    // Instantiate DUT
    alu dut (
        .operand_a(operand_a),
        .operand_b(operand_b),
        .alu_control(alu_control),
        .result(result),
        .zero(zero)
    );

    // Reusable output checker
    task automatic check_output(
        input logic [31:0] expected_result,
        input logic        expected_zero,
        input string       test_name
    );
        begin
            #1;

            if ((result === expected_result) &&
                (zero === expected_zero)) begin

                pass_count++;
                $display("PASS: %s", test_name);

            end
            else begin

                fail_count++;
                $display("FAIL: %s", test_name);
                $display("Expected = %h, Actual = %h",
                         expected_result, result);
                $display("Expected zero = %b, Actual zero = %b",
                         expected_zero, zero);

            end
        end
    endtask

    initial begin

        $dumpfile("alu.vcd");
        $dumpvars(0, tb_alu);

        // Test 1: ADD
        operand_a = 32'd10;
        operand_b = 32'd20;
        alu_control = ALU_ADD;
        check_output(32'd30, 1'b0, "ADD");

        // Test 2: SUB
        operand_a = 32'd20;
        operand_b = 32'd20;
        alu_control = ALU_SUB;
        check_output(32'd0, 1'b1, "SUB and zero flag");

        // Test 3: AND
        operand_a = 32'h0000000F;
        operand_b = 32'h00000003;
        alu_control = ALU_AND;
        check_output(32'h00000003, 1'b0, "AND");

        // Test 4: OR
        operand_a = 32'h0000000F;
        operand_b = 32'h00000030;
        alu_control = ALU_OR;
        check_output(32'h0000003F, 1'b0, "OR");

        // Test 5: XOR
        operand_a = 32'h0000000F;
        operand_b = 32'h00000003;
        alu_control = ALU_XOR;
        check_output(32'h0000000C, 1'b0, "XOR");

        // Test 6: SLL
        operand_a = 32'd3;
        operand_b = 32'd2;
        alu_control = ALU_SLL;
        check_output(32'd12, 1'b0, "SLL");

        // Test 7: SRL
        operand_a = 32'd16;
        operand_b = 32'd2;
        alu_control = ALU_SRL;
        check_output(32'd4, 1'b0, "SRL");

        // Test 8: SRA
        operand_a = 32'h80000000;
        operand_b = 32'd1;
        alu_control = ALU_SRA;
        check_output(32'hC0000000, 1'b0, "SRA signed shift");

        // Test 9: SLT (signed comparison)
        operand_a = 32'hFFFFFFFF; // -1
        operand_b = 32'd1;
        alu_control = ALU_SLT;
        check_output(32'd1, 1'b0, "SLT signed comparison");

        // Test 10: SLTU (unsigned comparison)
        operand_a = 32'hFFFFFFFF;
        operand_b = 32'd1;
        alu_control = ALU_SLTU;
        check_output(32'd0, 1'b1, "SLTU unsigned comparison");

        // Final summary
        $display("--------------------------------");
        $display("ALU TEST SUMMARY");
        $display("Passed: %0d", pass_count);
        $display("Failed: %0d", fail_count);
        $display("--------------------------------");

        if (fail_count == 0)
            $display("ALL TESTS PASSED!");
        else
            $display("SOME TESTS FAILED!");

        $finish;

    end

endmodule
