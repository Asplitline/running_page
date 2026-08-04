import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Tabs } from './Tabs';
import { Tooltip, TooltipProvider } from './Tooltip';
import { Dialog } from './Dialog';

// S4 verify:三件套能渲染 + Radix 行为挂载正常。

const TabsHarness = () => {
  const [v, setV] = useState('day');
  return (
    <Tabs
      ariaLabel="视图"
      value={v}
      onValueChange={setV}
      items={[
        { value: 'day', label: '日' },
        { value: 'week', label: '周' },
      ]}
    >
      <Tabs.Panel value="day">日视图内容</Tabs.Panel>
      <Tabs.Panel value="week">周视图内容</Tabs.Panel>
    </Tabs>
  );
};

describe('components/ui', () => {
  it('Tabs 渲染并显示激活面板', () => {
    render(<TabsHarness />);
    expect(screen.getByRole('tab', { name: '日' })).toBeDefined();
    expect(screen.getByText('日视图内容')).toBeDefined();
  });

  it('Tooltip 渲染 trigger', () => {
    render(
      <TooltipProvider>
        <Tooltip content="说明">
          <button>指标</button>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByRole('button', { name: '指标' })).toBeDefined();
  });

  it('Dialog 渲染 trigger', () => {
    render(
      <Dialog title="年度总结" trigger={<button>打开</button>}>
        内容
      </Dialog>
    );
    expect(screen.getByRole('button', { name: '打开' })).toBeDefined();
  });
});
