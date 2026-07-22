import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const plansFile = path.join(dataDir, 'subscription-plans.json');
const subscriptionsFile = path.join(dataDir, 'subscriptions.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(plansFile)) {
    const initialPlans = [
      { id: 'trial-1-week', label: '1 Week Trial', durationLabel: '7 days', description: 'A short trial plan for first-time business users.', isTrial: true, duration: { unit: 'days', value: 7 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'month-1', label: '1 Month', durationLabel: '1 month', description: 'A compact monthly plan for light usage.', duration: { unit: 'months', value: 1 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'month-6', label: '6 Months', durationLabel: '6 months', description: 'A longer medium-term plan for stable business operations.', duration: { unit: 'months', value: 6 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'year-1', label: '1 Year', durationLabel: '1 year', description: 'A standard annual subscription for uninterrupted workflows.', duration: { unit: 'years', value: 1 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'year-3', label: '3 Years', durationLabel: '3 years', description: 'A long-term plan for established business teams.', duration: { unit: 'years', value: 3 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'year-5', label: '5 Years', durationLabel: '5 years', description: 'A medium-long term plan for growing business teams.', duration: { unit: 'years', value: 5 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'year-10', label: '10 Years', durationLabel: '10 years', description: 'An extended plan for businesses that want a very long runway.', duration: { unit: 'years', value: 10 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    fs.writeFileSync(plansFile, JSON.stringify(initialPlans, null, 2));
  }
  if (!fs.existsSync(subscriptionsFile)) {
    fs.writeFileSync(subscriptionsFile, JSON.stringify([], null, 2));
  }
}

function readPlans(): any[] {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(plansFile, 'utf8'));
}

function writePlans(plans: any[]) {
  fs.writeFileSync(plansFile, JSON.stringify(plans, null, 2));
}

function readSubscriptions(): any[] {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'));
}

function writeSubscriptions(subscriptions: any[]) {
  fs.writeFileSync(subscriptionsFile, JSON.stringify(subscriptions, null, 2));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string[] }> }) {
  try {
    ensureDataDir();
    const { id: segments } = await params;
    const pathStr = segments?.join('/') || '';

    if (pathStr === 'plans' || pathStr === '') {
      const plans = readPlans();
      return NextResponse.json({ success: true, message: 'Subscription plans fetched successfully', plans });
    }

    if (pathStr.startsWith('plans/')) {
      const planId = pathStr.replace('plans/', '');
      const plans = readPlans();
      const plan = plans.find((p: any) => p.id === planId);
      if (!plan) {
        return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Plan fetched successfully', plan });
    }

    if (pathStr.startsWith('business/')) {
      const businessId = pathStr.replace('business/', '');
      const subscriptions = readSubscriptions();
      const subscription = subscriptions.find((s: any) => s.businessId === businessId);
      if (!subscription) {
        return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Business subscription fetched successfully', subscription });
    }

    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch data', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string[] }> }) {
  try {
    ensureDataDir();
    const { id: segments } = await params;
    const pathStr = segments?.join('/') || '';
    const body = await request.json();

    if (pathStr === 'plans' || pathStr === '') {
      const plans = readPlans();
      if (plans.some((p: any) => p.id === body.id)) {
        return NextResponse.json({ success: false, message: 'A plan with this ID already exists' }, { status: 400 });
      }
      const newPlan = { ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      plans.push(newPlan);
      writePlans(plans);
      return NextResponse.json({ success: true, message: 'Plan created successfully', plan: newPlan });
    }

    if (pathStr === 'business') {
      const subscriptions = readSubscriptions();
      const existingIndex = subscriptions.findIndex((s: any) => s.businessId === body.businessId);
      if (existingIndex >= 0) {
        subscriptions[existingIndex] = { ...subscriptions[existingIndex], ...body, updatedAt: new Date().toISOString() };
      } else {
        subscriptions.push({ ...body, id: `sub_${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      writeSubscriptions(subscriptions);
      const subscription = subscriptions.find((s: any) => s.businessId === body.businessId);
      return NextResponse.json({ success: true, message: 'Business subscription saved', subscription });
    }

    if (pathStr === 'business/cancel') {
      const subscriptions = readSubscriptions();
      const sub = subscriptions.find((s: any) => s.businessId === body.businessId);
      if (!sub) {
        return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: 404 });
      }
      sub.status = 'cancelled';
      sub.cancelledAt = new Date().toISOString();
      sub.updatedAt = new Date().toISOString();
      writeSubscriptions(subscriptions);
      return NextResponse.json({ success: true, message: 'Subscription cancelled', subscription: sub });
    }

    return NextResponse.json({ success: false, message: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to process request', error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string[] }> }) {
  try {
    ensureDataDir();
    const { id: segments } = await params;
    const pathStr = segments?.join('/') || '';
    const body = await request.json();

    if (pathStr.startsWith('plans/')) {
      const planId = pathStr.replace('plans/', '');
      const plans = readPlans();
      const index = plans.findIndex((p: any) => p.id === planId);
      if (index === -1) {
        return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
      }
      plans[index] = { ...plans[index], ...body, updatedAt: new Date().toISOString() };
      writePlans(plans);
      return NextResponse.json({ success: true, message: 'Plan updated successfully', plan: plans[index] });
    }

    return NextResponse.json({ success: false, message: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update', error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string[] }> }) {
  try {
    ensureDataDir();
    const { id: segments } = await params;
    const pathStr = segments?.join('/') || '';

    if (pathStr.startsWith('plans/')) {
      const planId = pathStr.replace('plans/', '');
      const plans = readPlans();
      const filtered = plans.filter((p: any) => p.id !== planId);
      if (filtered.length === plans.length) {
        return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
      }
      writePlans(filtered);
      return NextResponse.json({ success: true, message: 'Plan deleted successfully' });
    }

    return NextResponse.json({ success: false, message: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete', error: String(error) }, { status: 500 });
  }
}