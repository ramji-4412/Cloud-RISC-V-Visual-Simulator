
module tb_mux4;

  logic [31:0] in0, in1, in2, in3;
  logic [1:0] sel;
  logic [31:0] out;

  int pass_count = 0;
  int fail_count = 0;

  // DUT
  mux4 #(.WIDTH(32)) dut (
    .in0(in0),
    .in1(in1),
    .in2(in2),
    .in3(in3),
    .sel(sel),
    .out(out)
  );

  // Self-checking task
  task automatic check_output(
    input logic [31:0] expected
  );
    begin
      #1;

      if (out === expected) begin
        $display("PASS: sel=%b | out=%h", sel, out);
        pass_count++;
      end
      else begin
        $display("FAIL: sel=%b | Expected=%h | Actual=%h",
                 sel, expected, out);
        fail_count++;
      end
    end
  endtask

  initial begin

    $dumpfile("mux4.vcd");
    $dumpvars(0, tb_mux4);

    $display("Starting 4-to-1 MUX Testbench");

    // Input values
    in0 = 32'hAAAAAAAA;
    in1 = 32'hBBBBBBBB;
    in2 = 32'hCCCCCCCC;
    in3 = 32'hDDDDDDDD;

    // Test 1: Select in0
    sel = 2'b00;
    check_output(in0);

    // Test 2: Select in1
    sel = 2'b01;
    check_output(in1);

    // Test 3: Select in2
    sel = 2'b10;
    check_output(in2);

    // Test 4: Select in3
    sel = 2'b11;
    check_output(in3);

    // Change inputs and verify again
    in0 = 32'h12345678;
    in1 = 32'h87654321;
    in2 = 32'hABCDEF01;
    in3 = 32'h10203040;

    // Test 5
    sel = 2'b00;
    check_output(in0);

    // Test 6
    sel = 2'b01;
    check_output(in1);

    // Test 7
    sel = 2'b10;
    check_output(in2);

    // Test 8
    sel = 2'b11;
    check_output(in3);

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
