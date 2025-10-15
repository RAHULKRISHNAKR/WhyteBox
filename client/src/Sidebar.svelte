<script>
    import {Input, FormGroup, Label, FormCheck, Button, Row, Col } from 'sveltestrap';
</script>
  <Col class="d-flex flex-column" style="flex: 0 0 400px; max-width: 400px; height: calc(100vh - 60px); overflow-y: auto; border: 1px solid rgba(225,225,225,255); background-color: rgba(249,249,249,255);">
    <Row class="d-flex align-items-center" style="padding: 2.5px 10px;">
      <FormCheck type="switch" id="form-model" label="Hugging Face Model URL" bind:checked={isHuggingFaceModel} />
    </Row>
    <Row class="d-flex align-items-center" style="padding: 2.5px 10px;">
      <FormGroup class="d-flex align-items-center mb-0">
        <Label for="model-select" class="me-2 mb-0">Model</Label>
        <Input type="select" bind:value={selectedModel} id="model-select" class="me-3" disabled={isHuggingFaceModel}>
          {#each imagenetModels as modelName}
            <option value={modelName}>{modelName}</option>
          {/each}
        </Input>
      </FormGroup>
    </Row>
    <Row class="d-flex align-items-center" style="padding: 2.5px 10px;">
      <FormGroup class="d-flex align-items-center mb-0">
        <Label for="HuggingFace-url" class="me-2 mb-0">URL</Label>
        <Input type="text" id="model-url" placeholder="Type 'microsoft/resnet-18' here" class="me-3" disabled={!isHuggingFaceModel} />
      </FormGroup>
    </Row>
    <Row class="d-flex align-items-center" style="padding: 2.5px 10px;">
      <FormCheck type="switch" id="form-model" label="User Image Input" bind:checked={isUserInputImage} />
    </Row>
    <Row class="d-flex align-items-center" style="padding: 2.5px 10px;">
      <FormGroup class="d-flex align-items-center mb-0">
        <Label for="class-select" class="me-2 mb-0">Class</Label>
        <Input type="select" bind:value={selectedClass} id="class-select" class="me-3" disabled={isUserInputImage}>
          {#each Object.entries(imagenetClasses) as [index, className]}
            <option value={index}>{index}: {className}</option>
          {/each}
        </Input>
      </FormGroup>
    </Row>

    <Row class="d-flex align-items-center">
      <FormGroup class="d-flex align-items-center mb-0">
        <Label for="class-select" class="me-2 mb-0">Image Input</Label>
        <Input type="file" id="image-upload" accept="image/*" on:change={handleFileChange} disabled={!isUserInputImage} />
      </FormGroup>
    </Row>
  
    <Row class="d-flex align-items-center">
      <Button color="secondary" on:click={loadModelView}>Load</Button>
      <div class="d-flex justify-content-end">
        <div class="switch-container d-flex align-items-center">
          <FormCheck type="switch" id="form-ReLU" label="ReLU" bind:checked={reluActive} on:change={toggleReLU} disabled={!openModal} />
          <FormCheck type="switch" id="form-BN" label="BatchNorm" bind:checked={batchNormActive} on:change={toggleBN} disabled={!openModal} />
        </div>
      </div>
      <div class="d-flex justify-content-end"> 
        {#if selectedModule == "inception" && selectedBranch != undefined}
          <div class="d-flex">
            <Input type="select" bind:value={selectedBranch} id="branch-select" class="me-3" style="width: auto;">
              {#each branches as branch}
                <option value={branch}>{branch}</option>
              {/each}
            </Input>
          </div>
        {/if}
      </div>

    </Row>
    <Row class="mt-auto">
    </Row>
  </Col>