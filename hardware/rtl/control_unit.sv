
module control_unit (
    input  logic [6:0] opcode,
    input  logic [2:0] funct3,
    input  logic [6:0] funct7,

    output logic       RegWrite,
    output logic       ALUSrc,
    output logic       MemRead,
    output logic       MemWrite,
    output logic [1:0] ResultSrc,
    output logic       Branch,
    output logic       Jump,
    output logic [2:0] ImmSrc,
    output logic [3:0] ALUControl
);

    // RISC-V opcode definitions
    localparam logic [6:0] OP      = 7'b0110011;
    localparam logic [6:0] OP_IMM  = 7'b0010011;
    localparam logic [6:0] LOAD    = 7'b0000011;
    localparam logic [6:0] STORE   = 7'b0100011;
    localparam logic [6:0] BRANCH_OP = 7'b1100011;
    localparam logic [6:0] LUI     = 7'b0110111;
    localparam logic [6:0] AUIPC   = 7'b0010111;
    localparam logic [6:0] JAL     = 7'b1101111;
    localparam logic [6:0] JALR    = 7'b1100111;

    // Immediate format definitions
    localparam logic [2:0] IMM_I = 3'b000;
    localparam logic [2:0] IMM_S = 3'b001;
    localparam logic [2:0] IMM_B = 3'b010;
    localparam logic [2:0] IMM_U = 3'b011;
    localparam logic [2:0] IMM_J = 3'b100;

    // ALU operation definitions (must match alu.sv)
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

    always_comb begin

        // Safe defaults: no architectural state changes
        RegWrite  = 1'b0;
        ALUSrc    = 1'b0;
        MemRead   = 1'b0;
        MemWrite  = 1'b0;
        ResultSrc = 2'b00;
        Branch    = 1'b0;
        Jump      = 1'b0;
        ImmSrc    = IMM_I;
        ALUControl = ALU_ADD;

        case (opcode)

            // R-type register-register operations
            OP: begin
                RegWrite = 1'b1;
                ALUSrc   = 1'b0;

                case (funct3)
                    3'b000: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_ADD;
                        else if (funct7 == 7'b0100000)
                            ALUControl = ALU_SUB;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b001: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_SLL;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b010: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_SLT;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b011: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_SLTU;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b100: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_XOR;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b101: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_SRL;
                        else if (funct7 == 7'b0100000)
                            ALUControl = ALU_SRA;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b110: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_OR;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b111: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_AND;
                        else
                            RegWrite = 1'b0;
                    end
                endcase
            end

            // I-type arithmetic and logical operations
            OP_IMM: begin
                RegWrite = 1'b1;
                ALUSrc   = 1'b1;
                ImmSrc   = IMM_I;

                case (funct3)
                    3'b000: ALUControl = ALU_ADD;  // ADDI
                    3'b010: ALUControl = ALU_SLT;  // SLTI
                    3'b011: ALUControl = ALU_SLTU; // SLTIU
                    3'b100: ALUControl = ALU_XOR;  // XORI
                    3'b110: ALUControl = ALU_OR;   // ORI
                    3'b111: ALUControl = ALU_AND;  // ANDI

                    3'b001: begin                  // SLLI
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_SLL;
                        else
                            RegWrite = 1'b0;
                    end

                    3'b101: begin
                        if (funct7 == 7'b0000000)
                            ALUControl = ALU_SRL;  // SRLI
                        else if (funct7 == 7'b0100000)
                            ALUControl = ALU_SRA;  // SRAI
                        else
                            RegWrite = 1'b0;
                    end
                endcase
            end

            // Load: initial implementation supports LW
            LOAD: begin
                if (funct3 == 3'b010) begin
                    RegWrite  = 1'b1;
                    ALUSrc    = 1'b1;
                    MemRead   = 1'b1;
                    ResultSrc = 2'b01;
                    ImmSrc    = IMM_I;
                    ALUControl = ALU_ADD;
                end
            end

            // Store: initial implementation supports SW
            STORE: begin
                if (funct3 == 3'b010) begin
                    ALUSrc    = 1'b1;
                    MemWrite  = 1'b1;
                    ImmSrc    = IMM_S;
                    ALUControl = ALU_ADD;
                end
            end

            // Conditional branches
            BRANCH_OP: begin
                case (funct3)
                    3'b000, // BEQ
                    3'b001, // BNE
                    3'b100, // BLT
                    3'b101, // BGE
                    3'b110, // BLTU
                    3'b111: // BGEU
                    begin
                        Branch    = 1'b1;
                        ImmSrc    = IMM_B;
                        ALUControl = ALU_SUB;
                    end

                    default: begin
                        Branch = 1'b0;
                    end
                endcase
            end

            // LUI: upper immediate
            LUI: begin
                RegWrite  = 1'b1;
                ALUSrc    = 1'b1;
                ImmSrc    = IMM_U;
                ALUControl = ALU_ADD;
            end

            // AUIPC: PC-relative upper immediate
            AUIPC: begin
                RegWrite  = 1'b1;
                ALUSrc    = 1'b1;
                ImmSrc    = IMM_U;
                ALUControl = ALU_ADD;
            end

            // JAL
            JAL: begin
                RegWrite  = 1'b1;
                ResultSrc = 2'b10;
                Jump      = 1'b1;
                ImmSrc    = IMM_J;
            end

            // JALR
            JALR: begin
                if (funct3 == 3'b000) begin
                    RegWrite  = 1'b1;
                    ALUSrc    = 1'b1;
                    ResultSrc = 2'b10;
                    Jump      = 1'b1;
                    ImmSrc    = IMM_I;
                    ALUControl = ALU_ADD;
                end
            end

            // Unsupported opcode: retain safe defaults
            default: begin
                // No action
            end

        endcase
    end

endmodule
