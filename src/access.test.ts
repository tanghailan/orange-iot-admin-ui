import { describe, expect, it } from 'vitest';
import access from './access';

const agentMenu = [
  {
    id: 1,
    menuCode: 'iot:agents',
    menuType: 'PAGE' as const,
    menuName: '代理管理',
    name: '代理管理',
    path: '/iot/agents',
    sortOrder: 10,
    status: 1,
    children: [],
  },
];

describe('access', () => {
  it('should return canAdmin true when user has admin access', () => {
    const initialState = {
      currentUser: {
        userid: '1',
        name: 'Admin User',
        avatar: 'https://example.com/avatar.png',
        access: 'admin',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(true);
  });

  it('should return canAdmin false when user has non-admin access', () => {
    const initialState = {
      currentUser: {
        userid: '2',
        name: 'Regular User',
        avatar: 'https://example.com/avatar.png',
        access: 'user',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(false);
  });

  it('should return canAdmin false when user access is undefined', () => {
    const initialState = {
      currentUser: {
        userid: '3',
        name: 'Guest User',
        avatar: 'https://example.com/avatar.png',
      },
    };

    const result = access(initialState);

    expect(result.canAdmin).toBe(false);
  });

  it('should return canAdmin false when currentUser is undefined', () => {
    const initialState = {
      currentUser: undefined,
    };

    const result = access(initialState);

    expect(result.canAdmin).toBeFalsy();
  });

  it('should return canAdmin false when initialState is undefined', () => {
    const result = access(undefined);

    expect(result.canAdmin).toBeFalsy();
  });
});

describe('agent access', () => {
  it('requires both the agent permission code and dynamic menu path', () => {
    expect(
      access({
        accessCodes: ['iot:agent:list'],
        menus: agentMenu,
      }).canViewAgents,
    ).toBe(true);

    expect(
      access({
        accessCodes: ['iot:agent:list'],
        menus: [],
      }).canViewAgents,
    ).toBe(false);

    expect(
      access({
        accessCodes: [],
        menus: agentMenu,
      }).canViewAgents,
    ).toBe(false);
  });
});
