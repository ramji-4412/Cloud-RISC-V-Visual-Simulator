
module tb_control_unit;

    logic [6:0] opcode;
    logic [2:0] funct3;
    logic [6:0] funct7;

    logic       RegWrite;
    logic       ALUSrc;
    logic       MemRead;
    logic       MemWrite;
    logic [1:0] ResultSrc;
    logic       Branch;
    logic       Jump;
    logic [2:0] ImmSrc;
    logic [3:0] ALUControl;

    integer pass_count = 0;
    integer fail_count = 0;

    control_unit dut (
        .opcode(opcode),
        .funct3(funct3),
        .funct7(funct7),
        .RegWrite(RegWrite),
        .ALUSrc(ALUSrc),
        .MemRead(MemRead),
        .MemWrite(MemWrite),
        .ResultSrc(ResultSrc),
        .Branch(Branch),
        .Jump(Jump),
        .ImmSrc(ImmSrc),
        .ALUControl(ALUControl)
    );

    task automatic check_output(
        input string test_name,
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

        if ({
            RegWrite, ALUSrc, MemRead, MemWrite,
            ResultSrc, Branch, Jump, ImmSrc, ALUControl
        } === {
            exp_RegWrite, exp_ALUSrc, exp_MemRead, exp_MemWrite,
            exp_ResultSrc, exp_Branch, exp_Jump, exp_ImmSrc,
            exp_ALUControl
        }) begin
            $display("PASS: %s", test_name);
            pass_count = pass_count + 1;
        end
        else begin
            $display("FAIL: %s", test_name);
            $display("  Actual:   %b %b %b %b %b %b %b %b %b",
                RegWrite, ALUSrc, MemRead, MemWrite,
                ResultSrc, Branch, Jump, ImmSrc, ALUControl);
            $display("  Expected: %b %b %b %b %b %b %b %b %b",
                exp_RegWrite, exp_ALUSrc, exp_MemRead, exp_MemWrite,
                exp_ResultSrc, exp_Branch, exp_Jump, exp_ImmSrc,
                exp_ALUControl);
            fail_count = fail_count + 1;
        end
    end
    endtask

    initial begin

        $dumpfile("control_unit.vcd");
        $dumpvars(0, tb_control_unit);

        // R-type: ADD x5, x1, x2
        opcode = 7'b0110011;
        funct3 = 3'b000;
        funct7 = 7'b0000000;
        check_output("R-type ADD",
            1,0,0,0,2'b00,0,0,3'b000,4'b0000);

        // R-type: SUB
        funct7 = 7'b0100000;
        check_output("R-type SUB",
            1,0,0,0,2'b00,0,0,3'b000,4'b0001);

        // R-type: AND
        funct3 = 3'b111;
        funct7 = 7'b0000000;
        check_output("R-type AND",
            1,0,0,0,2'b00,0,0,3'b000,4'b0010);

        // R-type: SRA
        funct3 = 3'b101;
        funct7 = 7'b0100000;
        check_output("R-type SRA",
            1,0,0,0,2'b00,0,0,3'b000,4'b0111);

        // I-type: ADDI
        opcode = 7'b0010011;
        funct3 = 3'b000;
        funct7 = 7'b0000000;
        check_output("I-type ADDI",
            1,1,0,0,2'b00,0,0,3'b000,4'b0000);

        // I-type: SLTIU
        funct3 = 3'b011;
        check_output("I-type SLTIU",
            1,1,0,0,2'b00,0,0,3'b000,4'b1001);

        // I-type: SRAI
        funct3 = 3'b101;
        funct7 = 7'b0100000;
        check_output("I-type SRAI",
            1,1,0,0,2'b00,0,0,3'b000,4'b0111);

        // LW
        opcode = 7'b0000011;
        funct3 = 3'b010;
        funct7 = 7'b0000000;
        check_output("LW",
            1,1,1,0,2'b01,0,0,3'b000,4'b0000);

        // SW
        opcode = 7'b0100011;
        funct3 = 3'b010;
        check_output("SW",
            0,1,0,1,2'b00,0,0,3'b001,4'b0000);

        // BEQ
        opcode = 7'b1100011;
        funct3 = 3'b000;
        check_output("BEQ",
            0,0,0,0,2'b00,1,0,3'b010,4'b0001);

        // BLTU
        funct3 = 3'b110;
        check_output("BLTU",
            0,0,0,0,2'b00,1,0,3'b010,4'b0001);

        // LUI
        opcode = 7'b0110111;
        funct3 = 3'b000;
        check_output("LUI",
            1,1,0,0,2'b00,0,0,3'b011,4'b0000);

        // AUIPC
        opcode = 7'b0010111;
        check_output("AUIPC",
            1,1,0,0,2'b00,0,0,3'b011,4'b0000);

        // JAL
        opcode = 7'b1101111;
        check_output("JAL",
            1,0,0,0,2'b10,0,1,3'b100,4'b0000);

        // JALR
        opcode = 7'b1100111;
        funct3 = 3'b000;
        check_output("JALR",
            1,1,0,0,2'b10,0,1,3'b000,4'b0000);

        // Invalid branch funct3
        opcode = 7'b1100011;
        funct3 = 3'b010;
        check_output("Invalid branch",
            0,0,0,0,2'b00,0,0,3'b000,4'b0000);

        // Unsupported load width: LH
        opcode = 7'b0000011;
        funct3 = 3'b001;
        check_output("Unsupported load LH",
            0,0,0,0,2'b00,0,0,3'b000,4'b0000);

        // Unsupported opcode
        opcode = 7'b1111111;
        funct3 = 3'b000;
        funct7 = 7'b0000000;
        check_output("Unsupported opcode",
            0,0,0,0,2'b00,0,0,3'b000,4'b0000);

        // Invalid R-type funct7
        opcode = 7'b0110011;
        funct3 = 3'b000;
        funct7 = 7'b1111111;
        check_output("Invalid R-type encoding",
            0,0,0,0,2'b00,0,0,3'b000,4'b0000);

        $display("\n-------------------------------");
        $display("CONTROL UNIT TEST SUMMARY");
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
