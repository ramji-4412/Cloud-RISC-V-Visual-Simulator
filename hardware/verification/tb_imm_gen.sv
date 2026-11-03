
module tb_imm_gen;

    logic [31:0] instruction;
    logic [2:0]  imm_src;
    logic [31:0] imm_out;

    int pass_count = 0;
    int fail_count = 0;

    localparam logic [2:0] IMM_I = 3'b000;
    localparam logic [2:0] IMM_S = 3'b001;
    localparam logic [2:0] IMM_B = 3'b010;
    localparam logic [2:0] IMM_U = 3'b011;
    localparam logic [2:0] IMM_J = 3'b100;

    imm_gen dut (.*);

    task automatic check_output(
        input logic [31:0] expected,
        input string test_name
    );
        begin
            #1;

            if (imm_out === expected) begin
                pass_count++;
                $display("PASS: %s", test_name);
            end
            else begin
                fail_count++;
                $display("FAIL: %s", test_name);
                $display("Expected: %h", expected);
                $display("Actual:   %h", imm_out);
            end
        end
    endtask

    initial begin

        $dumpfile("imm_gen.vcd");
        $dumpvars(0, tb_imm_gen);

        // Test 1: I-type positive immediate (10)
        instruction = 32'h00A00000;
        imm_src = IMM_I;
        check_output(32'h0000000A, "I-type positive");

        // Test 2: I-type negative immediate (-5)
        instruction = 32'hFFB00000;
        imm_src = IMM_I;
        check_output(32'hFFFFFFFB, "I-type negative");

        // Test 3: S-type positive immediate (12)
        instruction = 32'h00500600;
        imm_src = IMM_S;
        check_output(32'h0000000C, "S-type positive");

        // Test 4: B-type positive immediate (8)
        instruction = 32'h00000400;
        imm_src = IMM_B;
        check_output(32'h00000008, "B-type positive");

        // Test 5: B-type negative immediate (-4)
        instruction = 32'hFE000E80;
        imm_src = IMM_B;
        check_output(32'hFFFFFFFC, "B-type negative");

        // Test 6: U-type immediate
        instruction = 32'h12345000;
        imm_src = IMM_U;
        check_output(32'h12345000, "U-type");

        // Test 7: J-type positive immediate (8)
        instruction = 32'h00800000;
        imm_src = IMM_J;
        check_output(32'h00000008, "J-type positive");

        // Test 8: J-type negative immediate (-4)
        instruction = 32'hFFDFF000;
        imm_src = IMM_J;
        check_output(32'hFFFFFFFC, "J-type negative");

        // Test 9: Unsupported format
        instruction = 32'hFFFFFFFF;
        imm_src = 3'b111;
        check_output(32'h00000000, "Unsupported format");

        // Summary
        $display("--------------------------------");
        $display("IMM GENERATOR TEST SUMMARY");
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
