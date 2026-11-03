// ============================================================================
// SIMULATION ENGINE (FULL RV32I INSTRUCTION SET & CYCLE-ACCURATE PIPELINE)
// ============================================================================

export const ABI_NAMES = [
  'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
  's0/fp', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
  'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
  's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6'
];

export const WAVEFORM_SIGNALS = [
  { key: 'clk', name: 'CLK', group: 'System', type: 'digital', color: '#38bdf8' },
  { key: 'pc', name: 'PC', group: 'System', type: 'bus', color: '#818cf8' },
  { key: 'if_id_valid', name: 'IF/ID Valid', group: 'Latches', type: 'digital', color: '#06b6d4' },
  { key: 'id_ex_valid', name: 'ID/EX Valid', group: 'Latches', type: 'digital', color: '#3b82f6' },
  { key: 'ex_mem_valid', name: 'EX/MEM Valid', group: 'Latches', type: 'digital', color: '#ec4899' },
  { key: 'mem_wb_valid', name: 'MEM/WB Valid', group: 'Latches', type: 'digital', color: '#10b981' },
  { key: 'stall', name: 'Stall', group: 'Hazard', type: 'digital', color: '#f59e0b' },
  { key: 'flush', name: 'Flush', group: 'Hazard', type: 'digital', color: '#f43f5e' },
  { key: 'fwdA', name: 'Forward A', group: 'Hazard', type: 'digital', color: '#a855f7' },
  { key: 'fwdB', name: 'Forward B', group: 'Hazard', type: 'digital', color: '#a855f7' },
  { key: 'alu_out', name: 'ALU Result', group: 'Datapath', type: 'bus', color: '#a3e635' },
  { key: 'reg_write', name: 'RegWrite', group: 'Control', type: 'digital', color: '#2dd4bf' },
  { key: 'mem_read', name: 'MemRead', group: 'Control', type: 'digital', color: '#fb923c' },
  { key: 'mem_write', name: 'MemWrite', group: 'Control', type: 'digital', color: '#f87171' }
];

export function toHex(val, pad = 8) {
  const unsigned = (val >>> 0);
  return '0x' + unsigned.toString(16).padStart(pad, '0').toUpperCase();
}

export function toBin(val, pad = 32) {
  const unsigned = (val >>> 0);
  return unsigned.toString(2).padStart(pad, '0');
}

export const EMPTY_BUBBLE = {
  valid: false,
  isBubble: true,
  pc: null,
  source: 'Bubble',
  rd: 0,
  rs1: 0,
  rs2: 0,
  imm: 0,
  ctrl: { regWrite: 0, memRead: 0, memWrite: 0, branch: 0, jump: 0, memToReg: 0, aluSrc: 0, aluOp: 'ADD' }
};

export function createInitialState() {
  return {
    cycle: 0,
    pc: 0,
    registers: new Int32Array(32),
    recentRegMod: -1,
    memory: {},
    recentMemMod: -1,
    pipeline: {
      IF: {
        valid: false,
        instruction: null,
        stageStatus: 'not_started',
        statusLabel: 'Not Started',
        statusReason: 'Processor idle. Ready to start simulation.',
        pc: 0,
        rawInstruction: 0
      },
      ID: {
        valid: false,
        instruction: null,
        stageStatus: 'not_started',
        statusLabel: 'Not Started',
        statusReason: 'Decode latch empty. Awaiting first fetched instruction.',
        rs1: 0,
        rs2: 0,
        rd: 0,
        imm: 0
      },
      EX: {
        valid: false,
        instruction: null,
        stageStatus: 'not_started',
        statusLabel: 'Not Started',
        statusReason: 'ALU execution unit idle.',
        valA: 0,
        valB: 0,
        fwdA: 'NONE',
        fwdB: 'NONE',
        aluOp: 'NOP',
        aluResult: 0
      },
      MEM: {
        valid: false,
        instruction: null,
        stageStatus: 'not_started',
        statusLabel: 'Not Started',
        statusReason: 'Data memory bus inactive.',
        aluResult: 0,
        writeData: 0,
        memRead: false,
        memWrite: false
      },
      WB: {
        valid: false,
        instruction: null,
        stageStatus: 'not_started',
        statusLabel: 'Not Started',
        statusReason: 'Register writeback bus inactive.',
        result: 0,
        rd: 0,
        regWrite: false
      }
    },
    hazards: {
      stall: false,
      flush: false,
      forwardA: 'NONE',
      forwardB: 'NONE'
    },
    waveforms: []
  };
}

// Full RV32I instruction assembler supporting R, I, S, B, U, J format instructions and labels
export function assembleRV32I(code) {
  const lines = (code || '').split(/\r?\n/);
  const instructions = [];
  const errors = [];
  const labels = {};
  let currentPC = 0;

  // Pass 1: Collect labels and calculate instruction addresses
  lines.forEach((rawLine) => {
    let line = rawLine.split('#')[0].trim();
    if (!line) return;

    if (line.includes(':')) {
      const parts = line.split(':');
      const label = parts[0].trim();
      if (label) {
        labels[label] = currentPC;
      }
      line = parts.slice(1).join(':').trim();
    }

    if (line) {
      currentPC += 4;
    }
  });

  const parseReg = (name) => {
    if (!name) return null;
    name = name.toLowerCase().trim();
    if (name.startsWith('x')) {
      const num = parseInt(name.slice(1), 10);
      if (!isNaN(num) && num >= 0 && num <= 31) return num;
    }
    const abiIndex = ABI_NAMES.findIndex(a => {
      const aliases = a.split('/');
      return aliases.includes(name);
    });
    if (abiIndex !== -1) return abiIndex;
    return null;
  };

  const parseImm = (token, pc = 0) => {
    if (!token) return 0;
    token = token.trim();
    if (labels[token] !== undefined) {
      return labels[token] - pc; // PC-relative offset for branches & jumps
    }
    if (token.startsWith('0x') || token.startsWith('0X')) {
      return parseInt(token, 16) || 0;
    }
    if (token.startsWith('0b') || token.startsWith('0B')) {
      return parseInt(token.slice(2), 2) || 0;
    }
    return parseInt(token, 10) || 0;
  };

  // Pass 2: Assemble instructions
  currentPC = 0;
  lines.forEach((rawLine, lineIndex) => {
    let line = rawLine.split('#')[0].trim();
    if (!line) return;

    if (line.includes(':')) {
      line = line.split(':').slice(1).join(':').trim();
      if (!line) return;
    }

    // Replace commas and parentheses with spaces: e.g. "lw x4, 0(x0)" -> ["lw", "x4", "0", "x0"]
    const tokens = line.replace(/,/g, ' ').replace(/\(/g, ' ').replace(/\)/g, ' ').trim().split(/\s+/);
    const mnemonic = tokens[0].toLowerCase();

    try {
      let inst = {
        pc: currentPC,
        source: line,
        lineIndex: lineIndex + 1,
        mnemonic,
        format: 'R',
        rd: 0,
        rs1: 0,
        rs2: 0,
        imm: 0,
        opcode: 0,
        funct3: 0,
        funct7: 0,
        machineCode: 0,
        ctrl: {
          regWrite: 0,
          aluSrc: 0,
          aluOp: 'ADD',
          memRead: 0,
          memWrite: 0,
          branch: 0,
          jump: 0,
          memToReg: 0
        }
      };

      // -------------------------------------------------------------
      // 1. R-Type Instructions: add, sub, sll, slt, sltu, xor, srl, sra, or, and
      // -------------------------------------------------------------
      if (['add', 'sub', 'sll', 'slt', 'sltu', 'xor', 'srl', 'sra', 'or', 'and'].includes(mnemonic)) {
        inst.format = 'R';
        inst.opcode = 0x33;
        inst.rd = parseReg(tokens[1]) ?? 0;
        inst.rs1 = parseReg(tokens[2]) ?? 0;
        inst.rs2 = parseReg(tokens[3]) ?? 0;
        inst.ctrl.regWrite = 1;
        inst.ctrl.aluSrc = 0;

        switch (mnemonic) {
          case 'add': inst.funct3 = 0x0; inst.funct7 = 0x00; inst.ctrl.aluOp = 'ADD'; break;
          case 'sub': inst.funct3 = 0x0; inst.funct7 = 0x20; inst.ctrl.aluOp = 'SUB'; break;
          case 'sll': inst.funct3 = 0x1; inst.funct7 = 0x00; inst.ctrl.aluOp = 'SLL'; break;
          case 'slt': inst.funct3 = 0x2; inst.funct7 = 0x00; inst.ctrl.aluOp = 'SLT'; break;
          case 'sltu': inst.funct3 = 0x3; inst.funct7 = 0x00; inst.ctrl.aluOp = 'SLTU'; break;
          case 'xor': inst.funct3 = 0x4; inst.funct7 = 0x00; inst.ctrl.aluOp = 'XOR'; break;
          case 'srl': inst.funct3 = 0x5; inst.funct7 = 0x00; inst.ctrl.aluOp = 'SRL'; break;
          case 'sra': inst.funct3 = 0x5; inst.funct7 = 0x20; inst.ctrl.aluOp = 'SRA'; break;
          case 'or':  inst.funct3 = 0x6; inst.funct7 = 0x00; inst.ctrl.aluOp = 'OR'; break;
          case 'and': inst.funct3 = 0x7; inst.funct7 = 0x00; inst.ctrl.aluOp = 'AND'; break;
        }

        inst.machineCode = ((inst.funct7 & 0x7F) << 25) |
                           ((inst.rs2 & 0x1F) << 20) |
                           ((inst.rs1 & 0x1F) << 15) |
                           ((inst.funct3 & 0x7) << 12) |
                           ((inst.rd & 0x1F) << 7) |
                           (inst.opcode & 0x7F);

      // -------------------------------------------------------------
      // 2. I-Type ALU: addi, slti, sltiu, xori, ori, andi, slli, srli, srai
      // -------------------------------------------------------------
      } else if (['addi', 'slti', 'sltiu', 'xori', 'ori', 'andi', 'slli', 'srli', 'srai'].includes(mnemonic)) {
        inst.format = 'I';
        inst.opcode = 0x13;
        inst.rd = parseReg(tokens[1]) ?? 0;
        inst.rs1 = parseReg(tokens[2]) ?? 0;
        inst.imm = parseImm(tokens[3]);
        inst.ctrl.regWrite = 1;
        inst.ctrl.aluSrc = 1;

        switch (mnemonic) {
          case 'addi': inst.funct3 = 0x0; inst.ctrl.aluOp = 'ADD'; break;
          case 'slli': inst.funct3 = 0x1; inst.funct7 = 0x00; inst.imm &= 0x1F; inst.ctrl.aluOp = 'SLL'; break;
          case 'slti': inst.funct3 = 0x2; inst.ctrl.aluOp = 'SLT'; break;
          case 'sltiu': inst.funct3 = 0x3; inst.ctrl.aluOp = 'SLTU'; break;
          case 'xori': inst.funct3 = 0x4; inst.ctrl.aluOp = 'XOR'; break;
          case 'srli': inst.funct3 = 0x5; inst.funct7 = 0x00; inst.imm &= 0x1F; inst.ctrl.aluOp = 'SRL'; break;
          case 'srai': inst.funct3 = 0x5; inst.funct7 = 0x20; inst.imm &= 0x1F; inst.ctrl.aluOp = 'SRA'; break;
          case 'ori':  inst.funct3 = 0x6; inst.ctrl.aluOp = 'OR'; break;
          case 'andi': inst.funct3 = 0x7; inst.ctrl.aluOp = 'AND'; break;
        }

        const imm12 = (mnemonic === 'srai' ? (0x20 << 5) | (inst.imm & 0x1F) : inst.imm) & 0xFFF;
        inst.machineCode = (imm12 << 20) |
                           ((inst.rs1 & 0x1F) << 15) |
                           ((inst.funct3 & 0x7) << 12) |
                           ((inst.rd & 0x1F) << 7) |
                           (inst.opcode & 0x7F);

      // -------------------------------------------------------------
      // 3. I-Type Load: lw
      // -------------------------------------------------------------
      } else if (mnemonic === 'lw') {
        inst.format = 'I';
        inst.opcode = 0x03;
        inst.funct3 = 0x2;
        inst.rd = parseReg(tokens[1]) ?? 0;
        inst.imm = parseImm(tokens[2]);
        inst.rs1 = parseReg(tokens[3]) ?? 0;
        inst.ctrl.regWrite = 1;
        inst.ctrl.aluSrc = 1;
        inst.ctrl.memRead = 1;
        inst.ctrl.memToReg = 1;
        inst.ctrl.aluOp = 'ADD';

        const imm12 = inst.imm & 0xFFF;
        inst.machineCode = (imm12 << 20) |
                           ((inst.rs1 & 0x1F) << 15) |
                           ((inst.funct3 & 0x7) << 12) |
                           ((inst.rd & 0x1F) << 7) |
                           (inst.opcode & 0x7F);

      // -------------------------------------------------------------
      // 4. S-Type Store: sw
      // -------------------------------------------------------------
      } else if (mnemonic === 'sw') {
        inst.format = 'S';
        inst.opcode = 0x23;
        inst.funct3 = 0x2;
        inst.rs2 = parseReg(tokens[1]) ?? 0;
        inst.imm = parseImm(tokens[2]);
        inst.rs1 = parseReg(tokens[3]) ?? 0;
        inst.ctrl.memWrite = 1;
        inst.ctrl.aluSrc = 1;
        inst.ctrl.aluOp = 'ADD';

        const imm12 = inst.imm & 0xFFF;
        const imm11_5 = (imm12 >> 5) & 0x7F;
        const imm4_0 = imm12 & 0x1F;

        inst.machineCode = (imm11_5 << 25) |
                           ((inst.rs2 & 0x1F) << 20) |
                           ((inst.rs1 & 0x1F) << 15) |
                           ((inst.funct3 & 0x7) << 12) |
                           (imm4_0 << 7) |
                           (inst.opcode & 0x7F);

      // -------------------------------------------------------------
      // 5. B-Type Branches: beq, bne, blt, bge, bltu, bgeu
      // -------------------------------------------------------------
      } else if (['beq', 'bne', 'blt', 'bge', 'bltu', 'bgeu'].includes(mnemonic)) {
        inst.format = 'B';
        inst.opcode = 0x63;
        inst.rs1 = parseReg(tokens[1]) ?? 0;
        inst.rs2 = parseReg(tokens[2]) ?? 0;
        inst.imm = parseImm(tokens[3], currentPC);
        inst.ctrl.branch = 1;
        inst.ctrl.aluOp = 'SUB';

        switch (mnemonic) {
          case 'beq':  inst.funct3 = 0x0; break;
          case 'bne':  inst.funct3 = 0x1; break;
          case 'blt':  inst.funct3 = 0x4; break;
          case 'bge':  inst.funct3 = 0x5; break;
          case 'bltu': inst.funct3 = 0x6; break;
          case 'bgeu': inst.funct3 = 0x7; break;
        }

        const imm12 = inst.imm;
        const bit12 = (imm12 >> 12) & 0x1;
        const bit11 = (imm12 >> 11) & 0x1;
        const bit10_5 = (imm12 >> 5) & 0x3F;
        const bit4_1 = (imm12 >> 1) & 0xF;

        inst.machineCode = (bit12 << 31) |
                           (bit10_5 << 25) |
                           ((inst.rs2 & 0x1F) << 20) |
                           ((inst.rs1 & 0x1F) << 15) |
                           ((inst.funct3 & 0x7) << 12) |
                           (bit4_1 << 8) |
                           (bit11 << 7) |
                           (inst.opcode & 0x7F);

      // -------------------------------------------------------------
      // 6. U-Type: lui, auipc
      // -------------------------------------------------------------
      } else if (['lui', 'auipc'].includes(mnemonic)) {
        inst.format = 'U';
        inst.opcode = mnemonic === 'lui' ? 0x37 : 0x17;
        inst.rd = parseReg(tokens[1]) ?? 0;
        inst.imm = parseImm(tokens[2]);
        inst.ctrl.regWrite = 1;
        inst.ctrl.aluSrc = 1;
        inst.ctrl.aluOp = mnemonic === 'lui' ? 'LUI' : 'AUIPC';

        inst.machineCode = ((inst.imm & 0xFFFFF) << 12) |
                           ((inst.rd & 0x1F) << 7) |
                           (inst.opcode & 0x7F);

      // -------------------------------------------------------------
      // 7. J-Type Jump: jal
      // -------------------------------------------------------------
      } else if (mnemonic === 'jal') {
        inst.format = 'J';
        inst.opcode = 0x6F;
        let rdToken = 'ra';
        let targetToken = tokens[1];
        if (tokens.length >= 3) {
          rdToken = tokens[1];
          targetToken = tokens[2];
        }
        inst.rd = parseReg(rdToken) ?? 1; // default to x1 (ra)
        inst.imm = parseImm(targetToken, currentPC);
        inst.ctrl.jump = 1;
        inst.ctrl.regWrite = 1;
        inst.ctrl.aluOp = 'JAL';

        const imm20 = inst.imm;
        const bit20 = (imm20 >> 20) & 0x1;
        const bit10_1 = (imm20 >> 1) & 0x3FF;
        const bit11 = (imm20 >> 11) & 0x1;
        const bit19_12 = (imm20 >> 12) & 0xFF;

        inst.machineCode = (bit20 << 31) |
                           (bit10_1 << 21) |
                           (bit11 << 20) |
                           (bit19_12 << 12) |
                           ((inst.rd & 0x1F) << 7) |
                           (inst.opcode & 0x7F);

      // -------------------------------------------------------------
      // 8. I-Type Jump: jalr
      // -------------------------------------------------------------
      } else if (mnemonic === 'jalr') {
        inst.format = 'I';
        inst.opcode = 0x67;
        inst.funct3 = 0x0;
        let rdToken = 'ra';
        let rs1Token = tokens[1];
        let offsetToken = '0';

        if (tokens.length >= 4) {
          rdToken = tokens[1];
          offsetToken = tokens[2];
          rs1Token = tokens[3];
        } else if (tokens.length === 3) {
          rdToken = tokens[1];
          rs1Token = tokens[2];
        }

        inst.rd = parseReg(rdToken) ?? 1;
        inst.rs1 = parseReg(rs1Token) ?? 0;
        inst.imm = parseImm(offsetToken);
        inst.ctrl.jump = 1;
        inst.ctrl.regWrite = 1;
        inst.ctrl.aluOp = 'JALR';

        const imm12 = inst.imm & 0xFFF;
        inst.machineCode = (imm12 << 20) |
                           ((inst.rs1 & 0x1F) << 15) |
                           ((inst.funct3 & 0x7) << 12) |
                           ((inst.rd & 0x1F) << 7) |
                           (inst.opcode & 0x7F);

      } else {
        throw new Error(`Unsupported or unrecognized mnemonic: "${mnemonic}"`);
      }

      instructions.push(inst);
      currentPC += 4;
    } catch (err) {
      errors.push(`Line ${lineIndex + 1}: ${err.message}`);
    }
  });

  return { instructions, errors };
}

// Cycle-accurate 5-stage pipeline step simulation
export function simulateStep(state, program = []) {
  const next = {
    cycle: state.cycle + 1,
    pc: state.pc,
    registers: new Int32Array(state.registers),
    recentRegMod: -1,
    memory: { ...state.memory },
    recentMemMod: -1,
    pipeline: {
      IF: { ...state.pipeline.IF },
      ID: { ...state.pipeline.ID },
      EX: { ...state.pipeline.EX },
      MEM: { ...state.pipeline.MEM },
      WB: { ...state.pipeline.WB }
    },
    hazards: {
      stall: false,
      flush: false,
      forwardA: 'NONE',
      forwardB: 'NONE'
    },
    waveforms: [...state.waveforms]
  };

  const idInst = state.pipeline.ID.instruction;
  const exInst = state.pipeline.EX.instruction;
  const memInst = state.pipeline.MEM.instruction;
  const wbInst = state.pipeline.WB.instruction;

  // --------------------------------------------------------------------------
  // 1. HAZARD DETECTION UNIT (Load-Use Stall)
  // --------------------------------------------------------------------------
  let stall = false;
  if (exInst && exInst.valid && exInst.ctrl.memRead) {
    if (idInst && idInst.valid) {
      const usesRs1 = ['R', 'I', 'S', 'B'].includes(idInst.format) && idInst.rs1 !== 0;
      const usesRs2 = ['R', 'S', 'B'].includes(idInst.format) && idInst.rs2 !== 0;
      if ((usesRs1 && idInst.rs1 === exInst.rd) || (usesRs2 && idInst.rs2 === exInst.rd)) {
        stall = true;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. FORWARDING UNIT (EX/MEM & MEM/WB -> EX)
  // --------------------------------------------------------------------------
  let fwdA = 'NONE';
  let fwdB = 'NONE';

  if (exInst && exInst.valid) {
    // Forward A
    if (exInst.rs1 !== 0) {
      if (memInst && memInst.valid && memInst.ctrl.regWrite && memInst.rd === exInst.rs1) {
        fwdA = 'EX/MEM';
      } else if (wbInst && wbInst.valid && wbInst.ctrl.regWrite && wbInst.rd === exInst.rs1) {
        fwdA = 'MEM/WB';
      }
    }
    // Forward B
    if (exInst.rs2 !== 0) {
      if (memInst && memInst.valid && memInst.ctrl.regWrite && memInst.rd === exInst.rs2) {
        fwdB = 'EX/MEM';
      } else if (wbInst && wbInst.valid && wbInst.ctrl.regWrite && wbInst.rd === exInst.rs2) {
        fwdB = 'MEM/WB';
      }
    }
  }

  next.hazards.stall = stall;
  next.hazards.forwardA = fwdA;
  next.hazards.forwardB = fwdB;

  // --------------------------------------------------------------------------
  // 3. EXECUTE STAGE & BRANCH RESOLUTION
  // --------------------------------------------------------------------------
  let branchFlush = false;
  let targetPC = state.pc;

  let aluResult = 0;
  let exWriteData = 0;

  if (exInst && exInst.valid) {
    let opA = state.registers[exInst.rs1] || 0;
    let opB = state.registers[exInst.rs2] || 0;

    // Apply Forwarding
    if (fwdA === 'EX/MEM' && state.pipeline.MEM.aluResult !== undefined) {
      opA = state.pipeline.MEM.aluResult;
    } else if (fwdA === 'MEM/WB' && state.pipeline.WB.result !== undefined) {
      opA = state.pipeline.WB.result;
    }

    if (fwdB === 'EX/MEM' && state.pipeline.MEM.aluResult !== undefined) {
      opB = state.pipeline.MEM.aluResult;
    } else if (fwdB === 'MEM/WB' && state.pipeline.WB.result !== undefined) {
      opB = state.pipeline.WB.result;
    }

    exWriteData = opB;
    const aluOperand2 = exInst.ctrl.aluSrc ? exInst.imm : opB;

    switch (exInst.ctrl.aluOp) {
      case 'ADD': aluResult = (opA + aluOperand2) | 0; break;
      case 'SUB': aluResult = (opA - aluOperand2) | 0; break;
      case 'AND': aluResult = (opA & aluOperand2) | 0; break;
      case 'OR':  aluResult = (opA | aluOperand2) | 0; break;
      case 'XOR': aluResult = (opA ^ aluOperand2) | 0; break;
      case 'SLT': aluResult = ((opA | 0) < (aluOperand2 | 0)) ? 1 : 0; break;
      case 'SLTU': aluResult = ((opA >>> 0) < (aluOperand2 >>> 0)) ? 1 : 0; break;
      case 'SLL': aluResult = (opA << (aluOperand2 & 0x1F)) | 0; break;
      case 'SRL': aluResult = (opA >>> (aluOperand2 & 0x1F)) | 0; break;
      case 'SRA': aluResult = (opA >> (aluOperand2 & 0x1F)) | 0; break;
      case 'LUI': aluResult = (aluOperand2 << 12) | 0; break;
      case 'AUIPC': aluResult = (exInst.pc + (aluOperand2 << 12)) | 0; break;
      case 'JAL':
      case 'JALR': aluResult = (exInst.pc + 4) | 0; break;
      default: aluResult = (opA + aluOperand2) | 0; break;
    }

    // Branch condition evaluation
    if (exInst.ctrl.branch) {
      let take = false;
      const sA = opA | 0;
      const sB = opB | 0;
      const uA = opA >>> 0;
      const uB = opB >>> 0;

      switch (exInst.mnemonic) {
        case 'beq':  take = (sA === sB); break;
        case 'bne':  take = (sA !== sB); break;
        case 'blt':  take = (sA < sB); break;
        case 'bge':  take = (sA >= sB); break;
        case 'bltu': take = (uA < uB); break;
        case 'bgeu': take = (uA >= uB); break;
        default:     take = false; break;
      }

      if (take) {
        branchFlush = true;
        targetPC = (exInst.pc + exInst.imm) | 0;
      }
    }

    // Jump condition evaluation
    if (exInst.ctrl.jump) {
      branchFlush = true;
      if (exInst.mnemonic === 'jal') {
        targetPC = (exInst.pc + exInst.imm) | 0;
      } else if (exInst.mnemonic === 'jalr') {
        targetPC = ((opA + exInst.imm) & ~1) | 0;
      }
    }
  }

  next.hazards.flush = branchFlush;

  // --------------------------------------------------------------------------
  // 4. MEMORY STAGE (sw / lw)
  // --------------------------------------------------------------------------
  let memReadValue = 0;
  if (memInst && memInst.valid) {
    const addr = state.pipeline.MEM.aluResult;
    if (memInst.ctrl.memWrite) {
      next.memory[addr] = state.pipeline.MEM.writeData;
      next.recentMemMod = addr;
    }
    if (memInst.ctrl.memRead) {
      memReadValue = next.memory[addr] || 0;
    }
  }

  // --------------------------------------------------------------------------
  // 5. WRITE-BACK STAGE (Register File Update)
  // --------------------------------------------------------------------------
  if (wbInst && wbInst.valid && wbInst.ctrl.regWrite && wbInst.rd !== 0) {
    next.registers[wbInst.rd] = state.pipeline.WB.result;
    next.recentRegMod = wbInst.rd;
  }
  next.registers[0] = 0; // Hardwire x0 to 0

  // --------------------------------------------------------------------------
  // 6. PIPELINE REGISTER ADVANCEMENT
  // --------------------------------------------------------------------------
  // WB gets MEM
  if (memInst && memInst.valid) {
    const wbVal = memInst.ctrl.memToReg ? memReadValue : state.pipeline.MEM.aluResult;
    const doesWrite = memInst.ctrl.regWrite && memInst.rd !== 0;
    next.pipeline.WB = {
      valid: true,
      instruction: memInst,
      result: wbVal,
      stageStatus: 'active',
      statusLabel: 'Active',
      statusReason: doesWrite
        ? `Committing result ${toHex(wbVal, 4)} to register x${memInst.rd} (${ABI_NAMES[memInst.rd]})`
        : 'Instruction retired (no register commit)',
      rd: memInst.rd,
      regWrite: Boolean(memInst.ctrl.regWrite)
    };
  } else if (state.pipeline.MEM?.stageStatus === 'bubble') {
    next.pipeline.WB = {
      valid: false,
      instruction: null,
      result: 0,
      stageStatus: 'bubble',
      statusLabel: 'Bubble',
      statusReason: 'Hazard bubble retiring from pipeline',
      rd: 0,
      regWrite: false
    };
  } else {
    next.pipeline.WB = {
      valid: false,
      instruction: null,
      result: 0,
      stageStatus: 'empty',
      statusLabel: 'Empty',
      statusReason: 'Writeback stage idle',
      rd: 0,
      regWrite: false
    };
  }

  // MEM gets EX
  if (exInst && exInst.valid && !branchFlush) {
    const isRead = Boolean(exInst.ctrl.memRead);
    const isWrite = Boolean(exInst.ctrl.memWrite);
    next.pipeline.MEM = {
      valid: true,
      instruction: exInst,
      aluResult: aluResult,
      writeData: exWriteData,
      stageStatus: 'active',
      statusLabel: 'Active',
      statusReason: isRead
        ? `Reading word from data memory address ${toHex(aluResult, 4)}`
        : isWrite
          ? `Writing ${toHex(exWriteData, 4)} to memory address ${toHex(aluResult, 4)}`
          : 'ALU pass-through (bypassing memory)',
      memRead: isRead,
      memWrite: isWrite,
      memAddress: aluResult
    };
  } else if (state.pipeline.EX?.stageStatus === 'bubble') {
    next.pipeline.MEM = {
      valid: false,
      instruction: null,
      aluResult: 0,
      writeData: 0,
      stageStatus: 'bubble',
      statusLabel: 'Bubble',
      statusReason: 'Hazard bubble advancing through memory stage',
      memRead: false,
      memWrite: false
    };
  } else {
    next.pipeline.MEM = {
      valid: false,
      instruction: null,
      aluResult: 0,
      writeData: 0,
      stageStatus: 'empty',
      statusLabel: 'Empty',
      statusReason: 'Memory access stage idle',
      memRead: false,
      memWrite: false
    };
  }

  // EX gets ID or Bubble (on Stall or Flush)
  if (branchFlush) {
    next.pipeline.EX = {
      valid: false,
      instruction: null,
      valA: 0,
      valB: 0,
      fwdA: 'NONE',
      fwdB: 'NONE',
      stageStatus: 'flushed',
      statusLabel: 'Flushed',
      statusReason: 'Instruction squashed due to taken branch/jump redirection'
    };
  } else if (stall) {
    next.pipeline.EX = {
      valid: false,
      instruction: { ...EMPTY_BUBBLE },
      valA: 0,
      valB: 0,
      fwdA: 'NONE',
      fwdB: 'NONE',
      stageStatus: 'bubble',
      statusLabel: 'Bubble',
      statusReason: 'Hardware bubble (NOP) inserted by Hazard Detection Unit'
    };
  } else if (idInst && idInst.valid) {
    next.pipeline.EX = {
      valid: true,
      instruction: idInst,
      valA: state.registers[idInst.rs1] || 0,
      valB: state.registers[idInst.rs2] || 0,
      fwdA,
      fwdB,
      stageStatus: 'active',
      statusLabel: 'Active',
      statusReason: `Executing ${idInst.mnemonic.toUpperCase()} in ALU (Op: ${idInst.ctrl.aluOp})`,
      aluOp: idInst.ctrl.aluOp
    };
  } else {
    next.pipeline.EX = {
      valid: false,
      instruction: null,
      valA: 0,
      valB: 0,
      fwdA: 'NONE',
      fwdB: 'NONE',
      stageStatus: 'empty',
      statusLabel: 'Empty',
      statusReason: 'Execution unit idle'
    };
  }

  // ID gets IF (unless Stalled or Flushed)
  if (branchFlush) {
    next.pipeline.ID = {
      valid: false,
      instruction: null,
      stageStatus: 'flushed',
      statusLabel: 'Flushed',
      statusReason: 'Decode latch cleared by branch/jump flush'
    };
  } else if (stall) {
    next.pipeline.ID = {
      ...state.pipeline.ID,
      stageStatus: 'stalled',
      statusLabel: 'Stalled / Held',
      statusReason: `Held waiting for load data from EX/MEM for register x${exInst?.rd}`
    };
  } else if (state.pipeline.IF?.valid && state.pipeline.IF.instruction) {
    const curInst = state.pipeline.IF.instruction;
    next.pipeline.ID = {
      valid: true,
      instruction: curInst,
      stageStatus: 'active',
      statusLabel: 'Active',
      statusReason: `Decoding ${curInst.mnemonic.toUpperCase()}: rs1=x${curInst.rs1}, rs2=x${curInst.rs2}, rd=x${curInst.rd}`,
      rs1: curInst.rs1,
      rs2: curInst.rs2,
      rd: curInst.rd,
      imm: curInst.imm
    };
  } else {
    next.pipeline.ID = {
      valid: false,
      instruction: null,
      stageStatus: 'empty',
      statusLabel: 'Empty',
      statusReason: 'Decode stage empty'
    };
  }

  // IF fetches new instruction (unless Stalled)
  if (branchFlush) {
    next.pc = targetPC;
    const fetchedInst = program.find(i => i.pc === targetPC);
    next.pipeline.IF = {
      valid: !!fetchedInst,
      instruction: fetchedInst ? { ...fetchedInst, valid: true } : null,
      stageStatus: fetchedInst ? 'active' : 'empty',
      statusLabel: fetchedInst ? 'Active' : 'Empty',
      statusReason: `Redirected fetch to branch/jump target PC ${toHex(targetPC, 4)}`,
      pc: targetPC,
      rawInstruction: fetchedInst ? fetchedInst.machineCode : 0x00000013
    };
    next.pc = targetPC + 4;
  } else if (stall) {
    next.pipeline.IF = {
      ...state.pipeline.IF,
      stageStatus: 'stalled',
      statusLabel: 'Stalled / Held',
      statusReason: 'Fetch frozen; Program Counter held in place due to load-use hazard'
    };
  } else {
    const fetchedInst = program.find(i => i.pc === state.pc);
    next.pipeline.IF = {
      valid: !!fetchedInst,
      instruction: fetchedInst ? { ...fetchedInst, valid: true } : null,
      stageStatus: fetchedInst ? 'active' : 'empty',
      statusLabel: fetchedInst ? 'Active' : 'Empty',
      statusReason: fetchedInst
        ? `Fetched ${fetchedInst.mnemonic.toUpperCase()} at PC ${toHex(fetchedInst.pc, 4)}`
        : 'No instruction at current PC (end of loaded program)',
      pc: state.pc,
      rawInstruction: fetchedInst ? fetchedInst.machineCode : 0x00000013
    };
    if (fetchedInst) {
      next.pc = state.pc + 4;
    }
  }

  // --------------------------------------------------------------------------
  // 7. RECORD WAVEFORM TELEMETRY POINT
  // --------------------------------------------------------------------------
  const wavePoint = {
    cycle: next.cycle,
    clk: next.cycle % 2 === 0 ? 0 : 1,
    pc: state.pc,
    if_id_valid: next.pipeline.ID.valid ? 1 : 0,
    id_ex_valid: next.pipeline.EX.valid ? 1 : 0,
    ex_mem_valid: next.pipeline.MEM.valid ? 1 : 0,
    mem_wb_valid: next.pipeline.WB.valid ? 1 : 0,
    stall: stall ? 1 : 0,
    flush: branchFlush ? 1 : 0,
    fwdA: fwdA !== 'NONE' ? 1 : 0,
    fwdB: fwdB !== 'NONE' ? 1 : 0,
    alu_out: aluResult,
    reg_write: (next.pipeline.WB.instruction && next.pipeline.WB.instruction.ctrl.regWrite) ? 1 : 0,
    mem_read: (next.pipeline.MEM.instruction && next.pipeline.MEM.instruction.ctrl.memRead) ? 1 : 0,
    mem_write: (next.pipeline.MEM.instruction && next.pipeline.MEM.instruction.ctrl.memWrite) ? 1 : 0
  };

  next.waveforms.push(wavePoint);
  if (next.waveforms.length > 80) next.waveforms.shift();

  return next;
}
