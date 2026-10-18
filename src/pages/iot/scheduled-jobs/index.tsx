import {
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccess } from '@umijs/max';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useMemo, useState } from 'react';
import {
  exportScheduledJobLogs,
  listScheduledJobs,
  pageScheduledJobLogs,
  type ScheduledJobLogRecord,
  type ScheduledJobRecord,
  type ScheduledJobUpdatePayload,
  triggerScheduledJob,
  updateScheduledJob,
} from '@/services/iot/scheduling';
import { downloadBlob, downloadCsv } from '@/utils/exportCsv';

type JobFormValues = ScheduledJobUpdatePayload;

const PAGE_SIZE = 20;

function formatTime(value?: string) {
  return value ? value.replace('T', ' ') : '-';
}

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const value = error as {
      message?: string;
      info?: { message?: string };
      response?: { data?: { message?: string } };
    };
    return (
      value.info?.message ||
      value.response?.data?.message ||
      value.message ||
      fallback
    );
  }
  return fallback;
}

function renderJobStatus(enabled: boolean) {
  return (
    <Tag color={enabled ? 'success' : 'default'}>
      {enabled ? '已启用' : '已停用'}
    </Tag>
  );
}

const ScheduledJobsPage: React.FC = () => {
  const access = useAccess();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<JobFormValues>();
  const [editingJob, setEditingJob] = useState<ScheduledJobRecord | null>(null);
  const [activeJobName, setActiveJobName] = useState<string>();
  const [logsOpen, setLogsOpen] = useState(false);
  const [logStatus, setLogStatus] = useState<string>();
  const [jobKeyword, setJobKeyword] = useState('');
  const [jobEnabled, setJobEnabled] = useState<boolean>();
  const [selectedJobKeys, setSelectedJobKeys] = useState<React.Key[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<ScheduledJobRecord[]>([]);
  const [selectedLogKeys, setSelectedLogKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE);

  const jobsQuery = useQuery({
    queryKey: ['iot-scheduled-jobs'],
    queryFn: () => listScheduledJobs(),
  });

  const logsQuery = useQuery({
    queryKey: ['iot-scheduled-job-logs', activeJobName, logStatus, page, size],
    queryFn: () =>
      pageScheduledJobLogs({
        page,
        size,
        ...(activeJobName ? { jobName: activeJobName } : {}),
        ...(logStatus ? { status: logStatus } : {}),
      }),
    enabled: logsOpen,
  });

  const saveMutation = useMutation({
    mutationFn: (variables: { jobName: string; body: JobFormValues }) =>
      updateScheduledJob(variables.jobName, variables.body),
    onSuccess: async () => {
      message.success('定时任务配置已更新');
      setEditingJob(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['iot-scheduled-jobs'] });
    },
    onError: (error) => message.error(errorText(error, '定时任务更新失败')),
  });

  const triggerMutation = useMutation({
    mutationFn: (jobName: string) => triggerScheduledJob(jobName),
    onSuccess: async () => {
      message.success('手动触发请求已提交');
      await queryClient.invalidateQueries({
        queryKey: ['iot-scheduled-job-logs'],
      });
    },
    onError: (error) => message.error(errorText(error, '手动触发任务失败')),
  });

  const openEditor = (record: ScheduledJobRecord) => {
    setEditingJob(record);
    form.setFieldsValue({
      cronExpression: record.cronExpression,
      enabled: record.enabled,
    });
  };

  const closeEditor = () => {
    if (saveMutation.isPending) return;
    setEditingJob(null);
    form.resetFields();
  };

  const submitEdit = (values: JobFormValues) => {
    if (!editingJob) return;
    saveMutation.mutate({
      jobName: editingJob.jobName,
      body: {
        cronExpression: values.cronExpression?.trim(),
        enabled: values.enabled,
      },
    });
  };

  const jobs = jobsQuery.data || [];
  const filteredJobs = useMemo(() => {
    const normalizedKeyword = jobKeyword.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [job.jobName, job.description].some((value) =>
          value?.toLowerCase().includes(normalizedKeyword),
        );
      const matchesEnabled =
        jobEnabled === undefined || job.enabled === jobEnabled;
      return matchesKeyword && matchesEnabled;
    });
  }, [jobEnabled, jobKeyword, jobs]);
  const logs = logsQuery.data;

  const resetJobFilters = () => {
    setJobKeyword('');
    setJobEnabled(undefined);
    setSelectedJobKeys([]);
    setSelectedJobs([]);
  };

  const openLogs = (jobName?: string) => {
    setActiveJobName(jobName);
    setLogStatus(undefined);
    setPage(1);
    setSelectedLogKeys([]);
    setLogsOpen(true);
  };

  const closeLogs = () => {
    setLogsOpen(false);
    setSelectedLogKeys([]);
  };

  const exportJobRows = (rows: ScheduledJobRecord[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `定时任务-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: '任务名称', value: (job) => job.jobName },
        { title: '说明', value: (job) => job.description },
        { title: 'Cron 表达式', value: (job) => job.cronExpression },
        { title: '状态', value: (job) => (job.enabled ? '已启用' : '已停用') },
        { title: '配置更新时间', value: (job) => job.updatedAt },
      ],
      rows,
    );
  };

  const exportLogRows = (rows: ScheduledJobLogRecord[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `定时任务执行日志-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: '日志 ID', value: (row) => row.id },
        { title: '任务名称', value: (row) => row.jobName },
        { title: '触发方式', value: (row) => row.triggerType },
        { title: '执行状态', value: (row) => row.status },
        { title: '执行摘要', value: (row) => row.message },
        { title: '错误信息', value: (row) => row.errorMessage },
        { title: '耗时毫秒', value: (row) => row.durationMs },
        { title: '开始时间', value: (row) => row.startedAt },
        { title: '结束时间', value: (row) => row.finishedAt },
        { title: '执行实例', value: (row) => row.instanceId },
      ],
      rows,
    );
  };

  const exportSelectedLogs = async () => {
    if (!selectedLogKeys.length) return;
    if (selectedLogKeys.length > 500) {
      message.warning('每次最多导出 500 条执行日志');
      return;
    }
    try {
      const blob = await exportScheduledJobLogs(selectedLogKeys.map(Number));
      downloadBlob(
        `定时任务执行日志-已选-${new Date().toISOString().slice(0, 10)}.csv`,
        blob,
      );
      message.success('已导出所选执行日志');
    } catch (error) {
      message.error(errorText(error, '执行日志导出失败'));
    }
  };

  const jobColumns: TableColumnsType<ScheduledJobRecord> = [
    {
      title: '任务名称',
      dataIndex: 'jobName',
      width: 220,
      ellipsis: true,
      render: (value: string, record) => (
        <Space orientation="vertical" size={2}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.description && (
            <Typography.Text type="secondary">
              {record.description}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'cronExpression',
      width: 240,
      render: (value?: string) => (
        <Typography.Text code>{value || '-'}</Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 110,
      render: (enabled: boolean) => renderJobStatus(enabled),
    },
    {
      title: '配置更新时间',
      dataIndex: 'updatedAt',
      width: 190,
      render: formatTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {access.canUpdateScheduledJob && (
            <Button
              icon={<EditOutlined />}
              onClick={() => openEditor(record)}
              disabled={saveMutation.isPending}
            >
              编辑
            </Button>
          )}
          {access.canTriggerScheduledJob && (
            <Popconfirm
              title="手动触发此任务？"
              description="任务会立即提交到调度服务执行。"
              okText="触发"
              cancelText="取消"
              okButtonProps={{
                loading:
                  triggerMutation.isPending &&
                  triggerMutation.variables === record.jobName,
              }}
              onConfirm={() => triggerMutation.mutateAsync(record.jobName)}
            >
              <Button
                type="primary"
                ghost
                icon={<PlayCircleOutlined />}
                loading={
                  triggerMutation.isPending &&
                  triggerMutation.variables === record.jobName
                }
                disabled={
                  triggerMutation.isPending &&
                  triggerMutation.variables !== record.jobName
                }
              >
                触发
              </Button>
            </Popconfirm>
          )}
          <Button
            icon={<HistoryOutlined />}
            onClick={() => openLogs(record.jobName)}
          >
            执行日志
          </Button>
        </Space>
      ),
    },
  ];

  const logColumns: TableColumnsType<ScheduledJobLogRecord> = [
    { title: '任务名称', dataIndex: 'jobName', width: 190, ellipsis: true },
    {
      title: '触发方式',
      dataIndex: 'triggerType',
      width: 110,
      render: (value?: string) => (
        <Tag color={value === 'manual' ? 'blue' : 'default'}>
          {value === 'manual'
            ? '手动'
            : value === 'cron'
              ? 'Cron'
              : value || '-'}
        </Tag>
      ),
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      width: 110,
      render: (value?: string) => (
        <Tag
          color={
            value === 'success'
              ? 'success'
              : value === 'failure'
                ? 'error'
                : 'default'
          }
        >
          {value === 'success'
            ? '成功'
            : value === 'failure'
              ? '失败'
              : value || '未知'}
        </Tag>
      ),
    },
    {
      title: '执行摘要',
      dataIndex: 'message',
      width: 240,
      ellipsis: true,
      render: (value?: string) => value || '-',
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      width: 280,
      ellipsis: true,
      render: (value?: string) =>
        value ? (
          <Typography.Text type="danger" ellipsis={{ tooltip: value }}>
            {value}
          </Typography.Text>
        ) : (
          '-'
        ),
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      width: 110,
      align: 'right',
      render: (value?: number) => (value == null ? '-' : `${value} ms`),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      width: 190,
      render: formatTime,
    },
    {
      title: '结束时间',
      dataIndex: 'finishedAt',
      width: 190,
      render: formatTime,
    },
    { title: '执行实例', dataIndex: 'instanceId', width: 180, ellipsis: true },
  ];

  return (
    <PageContainer
      title="定时任务"
      subTitle="管理任务 Cron 配置与启停状态，并查看执行记录"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={jobsQuery.isFetching || (logsOpen && logsQuery.isFetching)}
          onClick={() => {
            void queryClient.invalidateQueries({
              queryKey: ['iot-scheduled-jobs'],
            });
            if (logsOpen) {
              void queryClient.invalidateQueries({
                queryKey: ['iot-scheduled-job-logs'],
              });
            }
          }}
        >
          刷新
        </Button>,
        <Button key="all-logs" onClick={() => openLogs()}>
          全部执行日志
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ display: 'flex' }}>
        {jobsQuery.isError && (
          <Alert
            type="error"
            showIcon
            message="定时任务加载失败"
            description={errorText(jobsQuery.error, '请稍后重试')}
            action={
              <Button size="small" onClick={() => void jobsQuery.refetch()}>
                重试
              </Button>
            }
          />
        )}
        <Card
          title="任务配置"
          extra={
            <Space wrap>
              <Button
                icon={<DownloadOutlined />}
                disabled={!filteredJobs.length}
                onClick={() => exportJobRows(filteredJobs, '筛选结果')}
              >
                导出任务列表
              </Button>
              <Button
                icon={<DownloadOutlined />}
                disabled={!selectedJobs.length}
                onClick={() => exportJobRows(selectedJobs, '已选')}
              >
                导出已选（{selectedJobs.length}）
              </Button>
            </Space>
          }
        >
          <Space wrap style={{ display: 'flex', marginBottom: 16 }}>
            <Input.Search
              allowClear
              placeholder="搜索任务名称或说明"
              value={jobKeyword}
              style={{ width: 320 }}
              onChange={(event) => {
                setJobKeyword(event.target.value);
                setSelectedJobKeys([]);
                setSelectedJobs([]);
              }}
              onSearch={(value) => {
                setJobKeyword(value);
                setSelectedJobKeys([]);
                setSelectedJobs([]);
              }}
            />
            <Select
              allowClear
              placeholder="全部状态"
              value={jobEnabled}
              style={{ width: 140 }}
              options={[
                { value: true, label: '已启用' },
                { value: false, label: '已停用' },
              ]}
              onChange={(value?: boolean) => {
                setJobEnabled(value);
                setSelectedJobKeys([]);
                setSelectedJobs([]);
              }}
            />
            <Button onClick={resetJobFilters}>重置</Button>
          </Space>
          <Table<ScheduledJobRecord>
            rowKey="jobName"
            columns={jobColumns}
            dataSource={filteredJobs}
            rowSelection={{
              selectedRowKeys: selectedJobKeys,
              onChange: (keys, rows) => {
                setSelectedJobKeys(keys);
                setSelectedJobs(rows);
              },
            }}
            loading={jobsQuery.isLoading}
            pagination={false}
            scroll={{ x: 1150 }}
            locale={{ emptyText: <Empty description="暂无定时任务" /> }}
          />
        </Card>
      </Space>

      <Modal
        title={activeJobName ? `执行日志 · ${activeJobName}` : '全部执行日志'}
        open={logsOpen}
        onCancel={closeLogs}
        footer={[
          <Button key="close" onClick={closeLogs}>
            关闭
          </Button>,
          <Button
            key="export-page"
            icon={<DownloadOutlined />}
            disabled={!logs?.list.length}
            onClick={() => exportLogRows(logs?.list || [], '当前页')}
          >
            导出当前页
          </Button>,
          <Button
            key="export-selected"
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!selectedLogKeys.length}
            onClick={() => void exportSelectedLogs()}
          >
            导出已选（{selectedLogKeys.length}）
          </Button>,
        ]}
        width="min(1060px, calc(100vw - 32px))"
        style={{ top: '8vh' }}
        styles={{
          body: {
            maxHeight: '64vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '12px 16px',
          },
        }}
        destroyOnHidden
      >
        <Space
          align="center"
          wrap
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Space wrap>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部任务"
              style={{ width: 240 }}
              value={activeJobName}
              loading={jobsQuery.isFetching}
              options={jobs.map((job) => ({
                label: job.jobName,
                value: job.jobName,
              }))}
              onChange={(value?: string) => {
                setActiveJobName(value);
                setPage(1);
                setSelectedLogKeys([]);
              }}
            />
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 140 }}
              value={logStatus}
              options={[
                { label: '成功', value: 'success' },
                { label: '失败', value: 'failure' },
              ]}
              onChange={(value?: string) => {
                setLogStatus(value);
                setPage(1);
                setSelectedLogKeys([]);
              }}
            />
          </Space>
          <Space>
            <Typography.Text type="secondary">
              共 {logs?.total || 0} 条
            </Typography.Text>
            <Button
              icon={<ReloadOutlined />}
              loading={logsQuery.isFetching}
              onClick={() => void logsQuery.refetch()}
            >
              刷新
            </Button>
          </Space>
        </Space>

        {logsQuery.isError && (
          <Alert
            type="error"
            showIcon
            message="执行日志加载失败"
            description={errorText(logsQuery.error, '请稍后重试')}
            action={
              <Button size="small" onClick={() => void logsQuery.refetch()}>
                重试
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}
        <Table<ScheduledJobLogRecord>
          rowKey="id"
          columns={logColumns}
          dataSource={logs?.list || []}
          rowSelection={{
            selectedRowKeys: selectedLogKeys,
            preserveSelectedRowKeys: true,
            onChange: (keys) => setSelectedLogKeys(keys),
          }}
          loading={logsQuery.isLoading}
          pagination={false}
          scroll={{ x: 1320, y: 'calc(64vh - 220px)' }}
          locale={{ emptyText: <Empty description="暂无执行日志" /> }}
        />
        {Boolean(logs && logs.total > 0) && (
          <Pagination
            current={page}
            pageSize={size}
            total={logs?.total || 0}
            showSizeChanger
            showTotal={(total) => `共 ${total} 条`}
            pageSizeOptions={[10, 20, 50, 100]}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 16,
            }}
            onChange={(nextPage, nextSize) => {
              setPage(nextSize === size ? nextPage : 1);
              if (nextSize !== size) setSize(nextSize);
            }}
          />
        )}
      </Modal>

      <Modal
        title={editingJob ? `编辑任务：${editingJob.jobName}` : '编辑任务'}
        open={Boolean(editingJob)}
        onCancel={closeEditor}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form<JobFormValues>
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={submitEdit}
        >
          <Form.Item
            label="Cron 表达式"
            name="cronExpression"
            rules={[
              {
                required: true,
                whitespace: true,
                message: '请输入 Cron 表达式',
              },
              {
                validator: async (_, value?: string) => {
                  const fields = value?.trim().split(/\s+/) || [];
                  if (fields.length !== 6) {
                    throw new Error(
                      '请使用 Spring 六段 Cron 表达式，第一段为秒',
                    );
                  }
                },
              },
            ]}
            extra="使用 Spring 六段格式（含秒），例如：0 0/5 * * * ?"
          >
            <Input placeholder="0 0/5 * * * ?" />
          </Form.Item>
          <Form.Item
            label="任务状态"
            name="enabled"
            valuePropName="checked"
            rules={[{ required: true, message: '请选择任务状态' }]}
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ScheduledJobsPage;
