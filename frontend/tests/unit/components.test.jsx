import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Button, Badge, Card, Avatar, Spinner, Input, StatPill } from '@/shared/components/ui';

describe('Button', () => {
    it('renders children', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it.each([
        ['primary', 'shadow-primary'],
        ['secondary', 'shadow-sm'],
        ['ghost', null],
        ['destructive', 'shadow-destructive'],
        ['danger', 'shadow-destructive'],
        ['outline', 'border-primary'],
        ['success', 'shadow-success'],
    ])('applies %s variant with appropriate shadow', (variant, shadowClass) => {
        const { container } = render(<Button variant={variant}>Test</Button>);
        if (shadowClass) {
            expect(container.firstChild.className).toContain(shadowClass);
        }
    });

    it('renders primary as borderless with colored shadow', () => {
        const { container } = render(<Button variant="primary">CTA</Button>);
        const c = container.firstChild.className;
        expect(c).toContain('border-0');
        expect(c).toContain('shadow-primary/20');
    });

    it('renders destructive with colored shadow', () => {
        const { container } = render(<Button variant="destructive">Delete</Button>);
        expect(container.firstChild.className).toContain('shadow-destructive/20');
    });

    it('renders outline with brand border', () => {
        const { container } = render(<Button variant="outline">Outline</Button>);
        expect(container.firstChild.className).toContain('border-primary/30');
    });

    it('renders ghost without border', () => {
        const { container } = render(<Button variant="ghost">Ghost</Button>);
        expect(container.firstChild.className).toContain('border-0');
    });

    it('shows spinner when loading', () => {
        render(<Button isLoading>Loading</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('disables when loading', () => {
        render(<Button isLoading>Loading</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('preserves children in DOM during loading to prevent layout shift', () => {
        render(<Button isLoading>Loading</Button>);
        expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it.each([
        ['sm', 'h-8'],
        ['md', 'h-11'],
        ['lg', 'h-12'],
        ['xl', 'h-14'],
    ])('applies %s size styles', (size, expectedClass) => {
        const { container } = render(<Button size={size}>Test</Button>);
        expect(container.firstChild.className).toContain(expectedClass);
    });

    it('applies fullWidth', () => {
        const { container } = render(<Button fullWidth>Full</Button>);
        expect(container.firstChild.className).toContain('w-full');
    });

    it.each([
        ['sm', 'h-8 w-8'],
        ['md', 'h-10 w-10'],
        ['lg', 'h-12 w-12'],
        ['xl', 'h-14 w-14'],
    ])('applies iconOnly %s sizing', (size, expectedClass) => {
        const { container } = render(<Button iconOnly size={size}>X</Button>);
        expect(container.firstChild.className).toContain(expectedClass);
    });

    it('meets touch target minimum dimensions', () => {
        const { container } = render(<Button size="sm">Tiny</Button>);
        expect(container.firstChild.className).toContain('min-h-[44px]');
    });

    it('defaults type to button', () => {
        render(<Button>Submit</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('forwards ref', () => {
        const ref = { current: null };
        render(<Button ref={ref}>Ref</Button>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('applies aria-disabled when disabled', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });
});

describe('Badge', () => {
    it('renders children', () => {
        render(<Badge>New</Badge>);
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    it.each([
        ['default', 'bg-muted'],
        ['primary', 'bg-primary/10'],
        ['success', 'bg-success-bg'],
        ['warning', 'bg-warning-bg'],
        ['error', 'bg-danger-bg'],
        ['info', 'bg-info-bg'],
    ])('renders %s variant', (variant, expectedClass) => {
        const { container } = render(<Badge variant={variant}>Tag</Badge>);
        expect(container.firstChild.className).toContain(expectedClass);
    });

    it('shows dot when dot prop is true', () => {
        const { container } = render(<Badge dot>Dot</Badge>);
        expect(container.querySelector('span.inline-block.w-1\\.5')).toBeInTheDocument();
    });

    it('renders with correct accessibility when clickable', () => {
        render(<Badge onClick={() => {}}>Clickable</Badge>);
        expect(screen.getByRole('button')).toHaveTextContent('Clickable');
    });
});

describe('Card', () => {
    it('renders children', () => {
        render(<Card>Content</Card>);
        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('applies glass variant', () => {
        const { container } = render(<Card variant="glass">Glass</Card>);
        expect(container.firstChild.className).toContain('backdrop-blur');
    });

    it('applies interactive styles', () => {
        const { container } = render(<Card interactive>Hover me</Card>);
        expect(container.firstChild.className).toContain('cursor-pointer');
    });

    it('shows selected ring', () => {
        const { container } = render(<Card selected>Selected</Card>);
        expect(container.firstChild.className).toContain('ring-2');
    });

    it('has correct role when interactive', () => {
        render(<Card interactive>Interactive</Card>);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
});

describe('Avatar', () => {
    it('renders initials when no src', () => {
        render(<Avatar name="John Doe" />);
        expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders fallback icon when no name or src', () => {
        const { container } = render(<Avatar />);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders image when src provided', () => {
        const { container } = render(<Avatar src="https://example.com/avatar.jpg" alt="User" />);
        expect(container.querySelector('img')).toBeInTheDocument();
    });

    it('shows status dot when status prop set', () => {
        const { container } = render(<Avatar name="Test" status="online" />);
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots.length).toBeGreaterThanOrEqual(2);
    });

    it('is clickable with button role', () => {
        render(<Avatar name="Click" onClick={() => {}} />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
});

describe('Spinner', () => {
    it('renders with loading label', () => {
        render(<Spinner />);
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
    });

    it.each(['xs', 'sm', 'md', 'lg', 'xl'])('renders %s size', (size) => {
        const { container } = render(<Spinner size={size} />);
        expect(container.firstChild.className).toContain('animate-spin');
    });

    it('applies custom className', () => {
        const { container } = render(<Spinner className="my-custom-class" />);
        expect(container.firstChild.className).toContain('my-custom-class');
    });
});

describe('Input', () => {
    it('renders input element', () => {
        render(<Input />);
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders label', () => {
        render(<Input label="Email" />);
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('shows error state', () => {
        render(<Input error="Required" />);
        expect(screen.getByRole('alert')).toHaveTextContent('Required');
    });

    it('shows helper text', () => {
        render(<Input helperText="Enter your email" />);
        expect(screen.getByText('Enter your email')).toBeInTheDocument();
    });

    it('shows success message', () => {
        render(<Input success="Looks good!" />);
        expect(screen.getByText('Looks good!')).toBeInTheDocument();
    });

    it('shows clear button when clearable and value present', () => {
        render(<Input clearable value="text" onChange={() => {}} />);
        expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
    });

    it('renders left icon', () => {
        render(<Input leftIcon={<span data-testid="left-icon" />} />);
        expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('disables input', () => {
        render(<Input disabled />);
        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it.each(['sm', 'md', 'lg'])('renders %s size', (size) => {
        const { container } = render(<Input size={size} />);
            const input = container.querySelector('input');
            const heights = { sm: 'h-8', md: 'h-11', lg: 'h-12' };
            expect(input.className).toContain(heights[size]);
    });

    it('sets aria-invalid on error', () => {
        render(<Input error="Error" />);
        expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });
});

describe('StatPill', () => {
    const MockIcon = () => <svg data-testid="stat-icon" />;

    it('renders label and value', () => {
        render(<StatPill label="Total" value="$100" icon={MockIcon} />);
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('$100')).toBeInTheDocument();
    });

    it('renders icon', () => {
        render(<StatPill label="Test" value="5" icon={MockIcon} />);
        expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
    });

    it('applies compact mode', () => {
        const { container } = render(<StatPill label="Test" value="5" icon={MockIcon} compact />);
        expect(container.firstChild.className).toContain('py-2');
    });
});
