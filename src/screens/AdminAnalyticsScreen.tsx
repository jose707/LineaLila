import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type AdminAnalyticsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminAnalytics'
>;

interface AdminAnalyticsScreenProps {
  navigation: AdminAnalyticsScreenNavigationProp;
}

interface AnalyticsData {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalRevenue: number;
  averageRideValue: number;
  totalUsers: number;
  activeUsers: number;
  activeDrivers: number;
  activePassengers: number;
  ratingAverage: number;
  completionRate: number;
  growthRate: number;
}

const AdminAnalyticsScreen: React.FC<AdminAnalyticsScreenProps> = ({
  navigation,
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>(
    'month',
  );

  const analytics: AnalyticsData = {
    totalRides: 12843,
    completedRides: 12156,
    cancelledRides: 687,
    totalRevenue: 145230.5,
    averageRideValue: 11.32,
    totalUsers: 2547,
    activeUsers: 2219,
    activeDrivers: 328,
    activePassengers: 2219,
    ratingAverage: 4.6,
    completionRate: 94.6,
    growthRate: 12.5,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics & Reports</Text>
        <Text style={styles.headerEmpty} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeSection}>
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'week' && styles.timeRangeButtonActive,
          ]}
          onPress={() => setTimeRange('week')}
        >
          <Text
            style={[
              styles.timeRangeText,
              timeRange === 'week' && styles.timeRangeTextActive,
            ]}
          >
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'month' && styles.timeRangeButtonActive,
          ]}
          onPress={() => setTimeRange('month')}
        >
          <Text
            style={[
              styles.timeRangeText,
              timeRange === 'month' && styles.timeRangeTextActive,
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'year' && styles.timeRangeButtonActive,
          ]}
          onPress={() => setTimeRange('year')}
        >
          <Text
            style={[
              styles.timeRangeText,
              timeRange === 'year' && styles.timeRangeTextActive,
            ]}
          >
            This Year
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Total Rides"
              value={analytics.totalRides}
              subtitle="All time"
              color="#7C3AED"
              icon="🗺️"
            />
            <MetricCard
              label="Total Revenue"
              value={`$${analytics.totalRevenue.toFixed(2)}`}
              subtitle="All time"
              color="#10B981"
              icon="💰"
            />
            <MetricCard
              label="Avg. Ride Value"
              value={`$${analytics.averageRideValue.toFixed(2)}`}
              subtitle="Per ride"
              color="#3B82F6"
              icon="📈"
            />
            <MetricCard
              label="Platform Rating"
              value={`⭐ ${analytics.ratingAverage}`}
              subtitle="Average"
              color="#F59E0B"
              icon="⭐"
            />
          </View>
        </View>

        {/* Ride Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Ride Analytics</Text>
          <View style={styles.cardSection}>
            <CardRow
              label="Total Rides"
              value={analytics.totalRides}
              icon="🗺️"
            />
            <CardRow
              label="Completed Rides"
              value={analytics.completedRides}
              icon="✓"
            />
            <CardRow
              label="Cancelled Rides"
              value={analytics.cancelledRides}
              icon="✕"
            />
            <CardRow
              label="Completion Rate"
              value={`${analytics.completionRate}%`}
              icon="📊"
            />
          </View>
        </View>

        {/* User Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 User Analytics</Text>
          <View style={styles.cardSection}>
            <CardRow
              label="Total Users"
              value={analytics.totalUsers}
              icon="👥"
            />
            <CardRow
              label="Active Drivers"
              value={analytics.activeDrivers}
              icon="🚗"
            />
            <CardRow
              label="Active Passengers"
              value={analytics.activePassengers}
              icon="👩"
            />
            <CardRow
              label="Active Users"
              value={analytics.activeUsers}
              icon="👤"
            />
            <CardRow
              label="Growth Rate"
              value={`+${analytics.growthRate}%`}
              icon="📈"
            />
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Revenue Breakdown</Text>
          <View style={styles.revenueSection}>
            <RevenueItem
              label="Rider Fees"
              percentage={65}
              amount={94399.825}
            />
            <RevenueItem
              label="Driver Commissions"
              percentage={20}
              amount={29046.1}
            />
            <RevenueItem
              label="Platform Revenue"
              percentage={25}
              amount={36307.625}
            />
            <RevenueItem
              label="Service Fees"
              percentage={10}
              amount={14523.05}
            />
          </View>
        </View>

        {/* Performance Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Performance Indicators</Text>
          <View style={styles.performanceGrid}>
            <PerformanceCard
              title="On-Time Arrivals"
              percentage={92}
              trend="↑ +5%"
              trendColor="#10B981"
            />
            <PerformanceCard
              title="Customer Satisfaction"
              percentage={88}
              trend="↑ +3%"
              trendColor="#10B981"
            />
            <PerformanceCard
              title="Driver Retention"
              percentage={85}
              trend="↑ +4%"
              trendColor="#10B981"
            />
            <PerformanceCard
              title="User Retention"
              percentage={76}
              trend="↓ -2%"
              trendColor="#EF4444"
            />
            <PerformanceCard
              title="Safety Score"
              percentage={94}
              trend="↑ +1%"
              trendColor="#10B981"
            />
          </View>
        </View>

        {/* Export Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📥 Export Reports</Text>
          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportIcon}>📊</Text>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Download PDF Report</Text>
              <Text style={styles.exportDesc}>
                Comprehensive analytics report for {timeRange}
              </Text>
            </View>
            <Text style={styles.exportArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportIcon}>📈</Text>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Export to CSV</Text>
              <Text style={styles.exportDesc}>
                Raw data for external analysis
              </Text>
            </View>
            <Text style={styles.exportArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportIcon}>📧</Text>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Send Email Report</Text>
              <Text style={styles.exportDesc}>
                Schedule weekly analytics email
              </Text>
            </View>
            <Text style={styles.exportArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  color,
  icon,
}) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricSubtitle}>{subtitle}</Text>
  </View>
);

interface CardRowProps {
  label: string;
  value: string | number;
  icon: string;
}

const CardRow: React.FC<CardRowProps> = ({ label, value, icon }) => (
  <View style={styles.cardRow}>
    <Text style={styles.cardIcon}>{icon}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
  </View>
);

interface RevenueItemProps {
  label: string;
  percentage: number;
  amount: number;
}

const RevenueItem: React.FC<RevenueItemProps> = ({
  label,
  percentage,
  amount,
}) => (
  <View style={styles.revenueItem}>
    <View style={styles.revenueLeft}>
      <Text style={styles.revenueLabel}>{label}</Text>
      <Text style={styles.revenueAmount}>${amount.toFixed(2)}</Text>
    </View>
    <View style={styles.revenueRight}>
      <View style={styles.percentageBar}>
        <View style={[styles.percentageFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.percentageText}>{percentage}%</Text>
    </View>
  </View>
);

interface PerformanceCardProps {
  title: string;
  percentage: number;
  trend: string;
  trendColor: string;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  percentage,
  trend,
  trendColor,
}) => (
  <View style={styles.performanceCard}>
    <Text style={styles.performanceTitle}>{title}</Text>
    <Text style={styles.performancePercentage}>{percentage}%</Text>
    <Text style={[styles.performanceTrend, { color: trendColor }]}>
      {trend}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerEmpty: {
    width: 28,
  },
  timeRangeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 2,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  cardLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
  revenueSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  revenueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  revenueLeft: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  revenueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  revenueRight: {
    flex: 1,
    marginLeft: 12,
  },
  percentageBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  percentageFill: {
    height: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
    textAlign: 'right',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  performanceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  performanceTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  performancePercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  performanceTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exportIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  exportDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  exportArrow: {
    fontSize: 20,
    color: '#D1D5DB',
    marginLeft: 8,
  },
});

export default AdminAnalyticsScreen;
