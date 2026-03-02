import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  GitHubIcon,
  ArrowRightIcon,
  CheckIcon,
  XIcon,
  CodeIcon,
  CpuIcon,
  TargetIcon,
  FileIcon,
  CitationIcon,
  ParameterIcon,
  FormulaIcon,
  TestIcon,
  ImportIcon,
  VersionIcon,
  WarningIcon,
  RocketIcon,
  FolderIcon,
  TerminalIcon,
} from '@/components/icons'

describe('Icons', () => {
  it('renders GitHubIcon', () => {
    const { container } = render(<GitHubIcon className="test" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveClass('test')
  })

  it('renders ArrowRightIcon', () => {
    const { container } = render(<ArrowRightIcon className="test" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders CheckIcon with default and custom size', () => {
    const { container: c1 } = render(<CheckIcon />)
    expect(c1.querySelector('svg')).toHaveAttribute('width', '16')

    const { container: c2 } = render(<CheckIcon size={24} />)
    expect(c2.querySelector('svg')).toHaveAttribute('width', '24')
  })

  it('renders XIcon with default and custom size', () => {
    const { container: c1 } = render(<XIcon />)
    expect(c1.querySelector('svg')).toHaveAttribute('width', '16')

    const { container: c2 } = render(<XIcon size={32} />)
    expect(c2.querySelector('svg')).toHaveAttribute('width', '32')
  })

  it('renders CodeIcon', () => {
    const { container } = render(<CodeIcon />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '20')
  })

  it('renders CpuIcon', () => {
    const { container } = render(<CpuIcon />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '24')
  })

  it('renders TargetIcon', () => {
    const { container } = render(<TargetIcon />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '24')
  })

  it('renders FileIcon', () => {
    const { container } = render(<FileIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders CitationIcon', () => {
    const { container } = render(<CitationIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders ParameterIcon', () => {
    const { container } = render(<ParameterIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders FormulaIcon', () => {
    const { container } = render(<FormulaIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders TestIcon', () => {
    const { container } = render(<TestIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders ImportIcon', () => {
    const { container } = render(<ImportIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders VersionIcon', () => {
    const { container } = render(<VersionIcon />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders WarningIcon with default and custom size', () => {
    const { container: c1 } = render(<WarningIcon />)
    expect(c1.querySelector('svg')).toHaveAttribute('width', '20')

    const { container: c2 } = render(<WarningIcon size={28} />)
    expect(c2.querySelector('svg')).toHaveAttribute('width', '28')
  })

  it('renders RocketIcon with default and custom size', () => {
    const { container: c1 } = render(<RocketIcon />)
    expect(c1.querySelector('svg')).toHaveAttribute('width', '48')

    const { container: c2 } = render(<RocketIcon size={64} />)
    expect(c2.querySelector('svg')).toHaveAttribute('width', '64')
  })

  it('renders FolderIcon', () => {
    const { container } = render(<FolderIcon />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '20')
  })

  it('renders TerminalIcon', () => {
    const { container } = render(<TerminalIcon />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '20')
  })
})
