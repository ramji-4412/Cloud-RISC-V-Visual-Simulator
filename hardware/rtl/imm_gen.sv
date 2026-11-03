
module imm_gen (

    input  logic [31:0] instruction,
    input  logic [2:0]  imm_src,

    output logic [31:0] imm_out

);

    // Immediate format encodings
    localparam logic [2:0] IMM_I = 3'b000;
    localparam logic [2:0] IMM_S = 3'b001;
    localparam logic [2:0] IMM_B = 3'b010;
    localparam logic [2:0] IMM_U = 3'b011;
    localparam logic [2:0] IMM_J = 3'b100;

    always_comb begin

        // Default immediate
        imm_out = 32'b0;

        case (imm_src)

            // I-type immediate
            IMM_I: begin
                imm_out = {
                    {20{instruction[31]}},
                    instruction[31:20]
                };
            end

            // S-type immediate
            IMM_S: begin
                imm_out = {
                    {20{instruction[31]}},
                    instruction[31:25],
                    instruction[11:7]
                };
            end

            // B-type immediate
            IMM_B: begin
                imm_out = {
                    {19{instruction[31]}},
                    instruction[31],
                    instruction[7],
                    instruction[30:25],
                    instruction[11:8],
                    1'b0
                };
            end

            // U-type immediate
            IMM_U: begin
                imm_out = {
                    instruction[31:12],
                    12'b0
                };
            end

            // J-type immediate
            IMM_J: begin
                imm_out = {
                    {11{instruction[31]}},
                    instruction[31],
                    instruction[19:12],
                    instruction[20],
                    instruction[30:21],
                    1'b0
                };
            end

            // Unsupported immediate format
            default: begin
                imm_out = 32'b0;
            end

        endcase

    end

endmodule
