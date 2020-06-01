jest.unmock('../../src/TestResults/match-by-context');
jest.unmock('../test-helper');

import * as helper from '../test-helper';
import * as context from '../../src/TestResults/match-by-context';
import { TestReconciliationState } from '../../src/TestResults';
import { ItBlock, TestAssertionStatus } from 'jest-editor-support';

describe('buildAssertionContainer', () => {
  it('can build and sort assertions without ancestors', () => {
    const a1 = helper.makeAssertion('test-1', 'KnownSuccess', [], [1, 0]);
    const a2 = helper.makeAssertion('test-2', 'KnownSuccess', [], [2, 0]);
    const a3 = helper.makeAssertion('test-3', 'KnownSuccess', [], [3, 0]);
    const root = context.buildAssertionContainer([a1, a3, a2]);
    expect(root.childContainers).toHaveLength(0);
    expect(root.childData).toHaveLength(3);
    expect(root.childData.map((n) => n.zeroBasedLine)).toEqual([1, 2, 3]);
  });
  it('can build and sort assertions with ancestors', () => {
    const a1 = helper.makeAssertion('test-1', 'KnownSuccess', [], [1, 0]);
    const a2 = helper.makeAssertion('test-2', 'KnownSuccess', ['d-1'], [2, 0]);
    const a3 = helper.makeAssertion('test-3', 'KnownSuccess', ['d-1', 'd-1-1'], [3, 0]);
    const a4 = helper.makeAssertion('test-4', 'KnownSuccess', ['d-1'], [4, 0]);
    const a5 = helper.makeAssertion('test-4', 'KnownFail', ['d-2'], [5, 0]);
    const a6 = helper.makeAssertion('test-4', 'KnownFail', ['d-2'], [8, 0]);
    const root = context.buildAssertionContainer([a1, a5, a3, a2, a4, a6]);
    expect(root.childContainers).toHaveLength(2);
    expect(root.childData).toHaveLength(1);
    expect(root.childContainers.map((n) => [n.name, n.zeroBasedLine])).toEqual([
      ['d-1', 2],
      ['d-2', 5],
    ]);
    expect(root.childData.map((n) => [context.isDataNode(n) && n.name, n.zeroBasedLine])).toEqual([
      ['test-1', 1],
    ]);
  });
  it('can group assertions with the same line', () => {
    const a1 = helper.makeAssertion('test-1', 'KnownSuccess', [], [2, 0]);
    const a2 = helper.makeAssertion('test-2', 'KnownSuccess', [], [2, 0]);
    const a3 = helper.makeAssertion('test-3', 'KnownSuccess', [], [2, 0]);
    const a4 = helper.makeAssertion('test-4', 'KnownSuccess', [], [5, 0]);
    const root = context.buildAssertionContainer([a1, a3, a4, a2]);
    expect(root.childContainers).toHaveLength(0);
    expect(root.childData).toHaveLength(2);
    expect(root.childData.map((n) => n.zeroBasedLine)).toEqual([2, 5]);
    const groupNode = root.childData[0];
    if (context.isDataGroupNode(groupNode)) {
      expect(groupNode.nodes).toHaveLength(3);
      expect(groupNode.nodes.map((n) => n.name)).toEqual(['test-1', 'test-3', 'test-2']);
    } else {
      expect(context.isDataGroupNode(groupNode)).toBeTruthy();
    }
  });

  it('create a container based on assertion ancestorTitles structure', () => {
    const a1 = helper.makeAssertion('test-1', 'KnownSuccess', [], [1, 0]);
    const a2 = helper.makeAssertion('test-2', 'KnownSuccess', ['d-1'], [10, 0]);
    const a3 = helper.makeAssertion('test-3', 'KnownSuccess', ['d-1', 'd-2'], [15, 0]);
    const a4 = helper.makeAssertion('test-4', 'KnownFail', ['d-1'], [20, 0]);
    const root = context.buildAssertionContainer([a4, a3, a1, a2]);
    expect(root.childData.map((n) => (n as any).name)).toEqual(['test-1']);
    expect(root.childContainers).toHaveLength(1);
    const d1 = root.findContainer(['d-1']);
    expect(d1.childContainers).toHaveLength(1);
    expect(d1.childData.map((n) => (n as any).name)).toEqual(['test-2', 'test-4']);
    const d2 = d1.findContainer(['d-2']);
    expect(d2.childContainers).toHaveLength(0);
    expect(d2.childData.map((n) => (n as any).name)).toEqual(['test-3']);
  });
});
describe('buildSourceContainer', () => {
  it('can build and sort source container without ancestors', () => {
    const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
    const t2 = helper.makeItBlock('test-2', [6, 0, 7, 0]);
    const t3 = helper.makeItBlock('test-3', [8, 0, 10, 0]);
    const sourceRoot = helper.makeRoot([t2, t1, t3]);
    const root = context.buildSourceContainer(sourceRoot);
    expect(root.childContainers).toHaveLength(0);
    expect(root.childData.map((n) => (n as any).name)).toEqual(['test-1', 'test-2', 'test-3']);
  });
  it('can build and sort source container with ancestors', () => {
    const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
    const t2 = helper.makeItBlock('test-2', [6, 0, 7, 0]);
    const t3 = helper.makeItBlock('test-3', [8, 0, 10, 0]);
    const d1 = helper.makeDescribeBlock('d-1', [t2]);
    const d2 = helper.makeDescribeBlock('d-2', [t3]);
    const sourceRoot = helper.makeRoot([t1, d1, d2]);
    const root = context.buildSourceContainer(sourceRoot);
    expect(root.childContainers).toHaveLength(2);
    expect(root.childData).toHaveLength(1);
    expect(root.childData.map((n) => (n as any).name)).toEqual([t1.name]);

    const d1Container = root.findContainer(['d-1']);
    expect(d1Container?.childData).toHaveLength(1);
    expect(d1Container?.childContainers).toHaveLength(0);

    const d2Container = root.findContainer(['d-2']);
    expect(d2Container?.childData).toHaveLength(1);
    expect(d2Container?.childContainers).toHaveLength(0);
  });
  it('lines will be converted to zeroBased', () => {
    const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
    const t2 = helper.makeItBlock('test-2', [6, 0, 7, 0]);
    const sourceRoot = helper.makeRoot([t2, t1]);
    const root = context.buildSourceContainer(sourceRoot);
    expect(root.childContainers).toHaveLength(0);
    expect(root.childData.map((n) => n.zeroBasedLine)).toEqual([0, 5]);
  });
  it('can build and sort container from describe and it blocks', () => {
    const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
    const t2 = helper.makeItBlock('test-2', [6, 0, 7, 0]);
    const t3 = helper.makeItBlock('test-3', [8, 0, 10, 0]);
    const d1 = helper.makeDescribeBlock('d-1', [t1, t2]);
    const sourceRoot = helper.makeRoot([t3, d1]);
    const root = context.buildSourceContainer(sourceRoot);
    expect(root.childData.map((n) => (n as any).name)).toEqual(['test-3']);
    expect(root.childContainers).toHaveLength(1);
    const container = root.childContainers[0];
    expect(container.childContainers).toHaveLength(0);
    expect(container.childData.map((n) => (n as any).name)).toEqual(['test-1', 'test-2']);
  });
  it('does not group itBlocks even if they have the same start line (wrongly)', () => {
    const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
    const t2 = helper.makeItBlock('test-2', [1, 0, 7, 0]);
    const sourceRoot = helper.makeRoot([t1, t2]);
    const root = context.buildSourceContainer(sourceRoot);
    expect(root.childData.map((n) => (n as any).name)).toEqual(['test-1', 'test-2']);
    expect(root.childContainers).toHaveLength(0);
  });
});
describe('matchContainer', () => {
  it('tests are matched by context position regardless name and line', () => {
    const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
    const t2 = helper.makeItBlock('test-2-${num}', [6, 0, 7, 0]);
    const sourceRoot = helper.makeRoot([t2, t1]);
    const tContainer = context.buildSourceContainer(sourceRoot);

    const a1 = helper.makeAssertion('test-1', 'KnownFail', [], [0, 0]);
    const a2 = helper.makeAssertion('test-2-100', 'KnownSuccess', [], [7, 0]);
    const aContainer = context.buildAssertionContainer([a1, a2]);
    const matched = context.matchByContext('a file', tContainer, aContainer);

    expect(matched).toHaveLength(2);
    expect(matched.map((m) => m.name)).toEqual(['test-1', 'test-2-${num}']);
    expect(matched.map((m) => m.status)).toEqual(['KnownFail', 'KnownSuccess']);
  });
  it('can match tests with the same name but in different describe blocks', () => {
    const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
    const t2 = helper.makeItBlock('test-1', [6, 0, 7, 0]);
    const d1 = helper.makeDescribeBlock('d-1', [t2]);
    const sourceRoot = helper.makeRoot([t1, d1]);
    const tContainer = context.buildSourceContainer(sourceRoot);

    const a1 = helper.makeAssertion('test-1', 'KnownFail', [], [0, 0]);
    const a2 = helper.makeAssertion('test-1', 'KnownSuccess', ['d-1'], [5, 0]);
    const aContainer = context.buildAssertionContainer([a1, a2]);
    const matched = context.matchByContext('a file', tContainer, aContainer);
    expect(matched.map((m) => m.name)).toEqual(['test-1', 'test-1']);
    expect(matched.map((m) => m.status)).toEqual(['KnownFail', 'KnownSuccess']);
    expect(matched.map((m) => m.start.line)).toEqual([0, 5]);
    expect(matched.map((m) => m.end.line)).toEqual([4, 6]);
  });
  describe(`context do not align`, () => {
    it('when test block is missing assertion in the same container', () => {
      const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
      const sourceRoot = helper.makeRoot([t1]);
      const tContainer = context.buildSourceContainer(sourceRoot);
      const aContainer = context.buildAssertionContainer([]);
      const matched = context.matchByContext('a file', tContainer, aContainer);
      expect(matched.map((m) => m.name)).toEqual(['test-1']);
      expect(matched.map((m) => m.status)).toEqual(['Unknown']);
      expect(matched.map((m) => m.start.line)).toEqual([0]);
      expect(matched.map((m) => m.end.line)).toEqual([4]);
    });
    it('can still resolve by fallback to simple name match', () => {
      const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]);
      const t2 = helper.makeItBlock('test-2', [1, 0, 5, 0]);
      const sourceRoot = helper.makeRoot([t1, t2]);
      const tContainer = context.buildSourceContainer(sourceRoot);

      const a1 = helper.makeAssertion('test-1', 'KnownFail', [], [0, 0]);
      const aContainer = context.buildAssertionContainer([a1]);

      const matched = context.matchByContext('a file', tContainer, aContainer);
      expect(matched.map((m) => [m.name, m.status])).toEqual([
        ['test-1', 'KnownFail'],
        ['test-2', 'Unknown'],
      ]);
    });
    it('will continue match the child containers', () => {
      const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]); // under root
      const t2 = helper.makeItBlock('test-2', [6, 0, 7, 0]); // under d-1
      const t3 = helper.makeItBlock('test-3', [8, 0, 9, 0]); // under d-1
      const t4 = helper.makeItBlock('test-4', [10, 0, 12, 0]); // under d-1-1
      const d11 = helper.makeDescribeBlock('d-1-1', [t4]);
      const d1 = helper.makeDescribeBlock('d-1', [t2, t3, d11]);
      const sourceRoot = helper.makeRoot([t1, d1]);
      const tContainer = context.buildSourceContainer(sourceRoot);

      // assertion missing for 'd-1': t3
      const a1 = helper.makeAssertion('test-1', 'KnownSuccess', [], [6, 0]);
      const a2 = helper.makeAssertion('test-2', 'KnownFail', ['d-1'], [6, 0]);
      const a4 = helper.makeAssertion('test-4', 'KnownSuccess', ['d-1', 'd-1-1'], [9, 0]);
      const aContainer = context.buildAssertionContainer([a1, a2, a4]);

      const matched = context.matchByContext('a file', tContainer, aContainer);
      expect(matched.map((m) => [m.name, m.status])).toEqual([
        ['test-1', 'KnownSuccess'],
        ['test-2', 'KnownFail'],
        ['test-3', 'Unknown'],
        ['test-4', 'KnownSuccess'],
      ]);
    });
    it('describe block will fail if context mismatch and name lookup failed', () => {
      const t1 = helper.makeItBlock('test-1', [1, 0, 5, 0]); // under root
      const t2 = helper.makeItBlock('test-2', [6, 0, 7, 0]); // under d-1
      const d1 = helper.makeDescribeBlock('d-1', [t2]);
      const sourceRoot = helper.makeRoot([t1, d1]);
      const tContainer = context.buildSourceContainer(sourceRoot);

      // assertion missing for t3
      const a1 = helper.makeAssertion('test-1', 'KnownSuccess', [], [6, 0]);
      const aContainer = context.buildAssertionContainer([a1]);

      const matched = context.matchByContext('a file', tContainer, aContainer);
      expect(matched.map((m) => [m.name, m.status])).toEqual([
        ['test-1', 'KnownSuccess'],
        ['test-2', 'Unknown'],
      ]);
    });
  });
  describe('1-many (jest.each) match', () => {
    const createTestData = (
      statusList: TestReconciliationState[]
    ): [context.ContainerNode<ItBlock>, context.ContainerNode<TestAssertionStatus>] => {
      const t1 = helper.makeItBlock('', [12, 1, 20, 1]);
      const sourceRoot = helper.makeRoot([t1]);
      const tContainer = context.buildSourceContainer(sourceRoot);

      // this match jest.each with 2 assertions
      const assertions = statusList.map((s, idx) =>
        helper.makeAssertion(`test-${idx}`, s, [], [11, 0])
      );
      const aContainer = context.buildAssertionContainer(assertions);
      return [tContainer, aContainer];
    };
    it('any failed assertion will fail the test', () => {
      const [tContainer, aContainer] = createTestData([
        'KnownSuccess',
        'KnownFail',
        'KnownSuccess',
      ]);
      const matched = context.matchByContext('a file', tContainer, aContainer);
      expect(matched).toHaveLength(1);
      expect(matched[0].status).toEqual('KnownFail');
      expect(matched[0].start).toEqual({ line: 11, column: 0 });
      expect(matched[0].end).toEqual({ line: 19, column: 0 });
    });
    it('test is succeeded if all assertions are successful', () => {
      const [tContainer, aContainer] = createTestData([
        'KnownSuccess',
        'KnownSuccess',
        'KnownSuccess',
      ]);
      const matched = context.matchByContext('a file', tContainer, aContainer);
      expect(matched).toHaveLength(1);
      expect(matched[0].status).toEqual('KnownSuccess');
    });
    it('test is skip when all assertions are skipped', () => {
      const [tContainer, aContainer] = createTestData([
        TestReconciliationState.KnownSkip,
        TestReconciliationState.KnownSkip,
        TestReconciliationState.KnownSkip,
      ]);
      const matched = context.matchByContext('a file', tContainer, aContainer);
      expect(matched).toHaveLength(1);
      expect(matched[0].status).toEqual(TestReconciliationState.KnownSkip);
    });
    it(`if failed, the result should contain all error lines reported`, () => {
      //TODO
    });
  });
});
